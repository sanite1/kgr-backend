import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import GatePass from "../models/GatePass";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import { inBackground } from "../helpers/background";
import { MANAGERS, isNotificationMuted } from "../config/roles";
import { UserRole } from "../interfaces/helper.interface";
import {
  sendGatePassRequestMail,
  sendGatePassDecisionMail,
} from "./nodemailer/mail.service";
import {
  IGatePass,
  ICreateGatePass,
  IDecideGatePass,
  IClearGatePassItem,
  IGatePassesQuery,
} from "../interfaces/gatePass.interface";

const PASS_ID_START = Number(process.env.GATE_PASS_ID_START) || 1;
const CONSOLE_URL =
  process.env.CONSOLE_URL || "https://admin.kgrpartnersltd.com";

interface Requester {
  id: string;
  role: UserRole;
}

// Every manager and admin hears about a new pass so someone acts fast.
// Fire-and-forget: lookups and sends never block the response.
const notifyApprovers = (pass: IGatePass): void => {
  inBackground(
    (async () => {
      const approvers = await User.find({
        role: { $in: MANAGERS },
        isActive: true,
      }).limit(10);
      await Promise.all(
        approvers
          .filter((a) => a.email && !isNotificationMuted(a.email))
          .map((a) =>
            sendGatePassRequestMail(a.email, {
              approverName: a.firstName,
              passId: pass.passId,
              requestedByName: pass.requestedByName,
              department: pass.department,
              itemsCount: pass.items.length,
              exitAt: pass.exitAt,
              consoleUrl: `${CONSOLE_URL}/gate-pass`,
            }).catch(() => undefined),
          ),
      );
    })().catch(() => undefined),
  );
};

// Tells the requester the verdict, unless they decided it themselves.
const notifyRequester = (
  pass: IGatePass,
  decidedById: string,
  approved: boolean,
): void => {
  if (String(pass.requestedBy) === decidedById) return;
  inBackground(
    (async () => {
      const requester = await User.findById(pass.requestedBy);
      if (!requester?.email) return;
      await sendGatePassDecisionMail(requester.email, {
        name: requester.firstName,
        passId: pass.passId,
        approved,
        note: pass.decisionNote || undefined,
      });
    })().catch(() => undefined),
  );
};

// POST /api/gate-passes: staff raise the exit form
export const createGatePassService = async (
  payload: ICreateGatePass,
  requestedById: string,
) => {
  const user = await User.findById(requestedById);
  if (!user) throw new ApiError(404, "User not found");

  const passId = await nextSequence("gate_pass_id", PASS_ID_START);
  const pass = await GatePass.create({
    passId,
    date: dayString(),
    requestedBy: requestedById,
    requestedByName: `${user.firstName} ${user.lastName}`.trim(),
    department: payload.department.trim(),
    designation: payload.designation?.trim() || "",
    exitAt: payload.exitAt.trim(),
    items: payload.items.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      purpose: item.purpose?.trim() || "",
      location: item.location?.trim() || "",
    })),
  });

  notifyApprovers(pass);

  return new ApiResponse(
    201,
    `Gate pass #${passId} sent for approval`,
    pass.toJSON(),
  );
};

// Who may see what: management everything, the gate only what it can act
// on, everyone else strictly their own passes.
const scopeFilter = (requester: Requester): Record<string, any> => {
  if (MANAGERS.includes(requester.role)) return {};
  if (requester.role === "security") {
    return { status: { $in: ["approved", "carried_out"] } };
  }
  return { requestedBy: requester.id };
};

// GET /api/gate-passes
export const getGatePassesService = async (
  query: IGatePassesQuery,
  requester: Requester,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter = scopeFilter(requester);
  if (query.status) {
    // the scope may already constrain status; the narrower one wins
    if (filter.status?.$in && !filter.status.$in.includes(query.status)) {
      return PaginatedResponse.build(
        [],
        0,
        page,
        pageSize,
        "Gate passes retrieved successfully",
      );
    }
    filter.status = query.status;
  }
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { requestedByName: pattern },
      { department: pattern },
      { "items.description": pattern },
    ];
    if (/^\d+$/.test(term)) or.push({ passId: Number(term) });
    filter.$or = or;
  }

  const [passes, totalItems] = await Promise.all([
    GatePass.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    GatePass.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    passes.map((p) => p.toJSON()),
    totalItems,
    page,
    pageSize,
    "Gate passes retrieved successfully",
  );
};

// POST /api/gate-passes/:id/approve (managers)
export const approveGatePassService = async (
  id: string,
  payload: IDecideGatePass,
  decider: Requester,
) => {
  const pass = await GatePass.findById(id);
  if (!pass) throw new ApiError(404, "Gate pass not found");
  if (pass.status !== "pending") {
    throw new ApiError(
      400,
      `Gate pass #${pass.passId} is already ${pass.status.replace("_", " ")}`,
    );
  }

  const user = await User.findById(decider.id);
  pass.status = "approved";
  pass.decidedBy = decider.id as any;
  pass.decidedByName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  pass.decidedAt = new Date();
  pass.decisionNote = payload.note || "";
  await pass.save();

  notifyRequester(pass, decider.id, true);

  return new ApiResponse(
    200,
    `Gate pass #${pass.passId} approved. Security can now release it.`,
    pass.toJSON(),
  );
};

// POST /api/gate-passes/:id/decline (managers)
export const declineGatePassService = async (
  id: string,
  payload: IDecideGatePass,
  decider: Requester,
) => {
  const pass = await GatePass.findById(id);
  if (!pass) throw new ApiError(404, "Gate pass not found");
  if (pass.status !== "pending") {
    throw new ApiError(
      400,
      `Gate pass #${pass.passId} is already ${pass.status.replace("_", " ")}`,
    );
  }

  const user = await User.findById(decider.id);
  pass.status = "declined";
  pass.decidedBy = decider.id as any;
  pass.decidedByName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  pass.decidedAt = new Date();
  pass.decisionNote = payload.note || "";
  await pass.save();

  notifyRequester(pass, decider.id, false);

  return new ApiResponse(
    200,
    `Gate pass #${pass.passId} declined`,
    pass.toJSON(),
  );
};

// POST /api/gate-passes/:id/carry-out (security, admin): the items have
// physically left through the gate. Only an approved pass can leave.
// POST /api/gate-passes/:id/items/:index/clear: the staff shows the
// pass number at the gate, security opens the pass and checks the
// listed items one by one against what they can actually see. Cleared
// means it matches; flagged means more, less or different, and the
// item is NOT allowed out. Re-checking overwrites, so a mis-tap is
// fixable while the pass is still open.
export const clearGatePassItemService = async (
  id: string,
  index: number,
  payload: IClearGatePassItem,
  requester: Requester,
) => {
  const pass = await GatePass.findById(id);
  if (!pass) throw new ApiError(404, "Gate pass not found");
  if (pass.status !== "approved") {
    throw new ApiError(
      400,
      pass.status === "carried_out"
        ? `Gate pass #${pass.passId} was already carried out`
        : `Gate pass #${pass.passId} is not approved. Do not release these items.`,
    );
  }

  const item = pass.items[index];
  if (!item) throw new ApiError(404, "That item is not on this pass");

  const note = payload.note?.trim() || "";
  if (
    payload.outcome === "flagged" &&
    payload.seenQuantity === undefined &&
    !note
  ) {
    throw new ApiError(
      400,
      "Say what you saw: enter the quantity seen or write a note",
    );
  }

  const user = await User.findById(requester.id);
  item.clearance = {
    status: payload.outcome,
    seenQuantity: payload.seenQuantity,
    note,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    at: new Date(),
  };
  pass.markModified("items");
  await pass.save();

  return new ApiResponse(
    200,
    payload.outcome === "cleared"
      ? `"${item.description}" cleared at the gate`
      : `"${item.description}" flagged and held back`,
    pass.toJSON(),
  );
};

export const carryOutGatePassService = async (
  id: string,
  requester: Requester,
) => {
  const pass = await GatePass.findById(id);
  if (!pass) throw new ApiError(404, "Gate pass not found");
  if (pass.status === "pending") {
    throw new ApiError(
      400,
      `Gate pass #${pass.passId} has NOT been approved by management. Do not release these items.`,
    );
  }
  if (pass.status === "declined") {
    throw new ApiError(
      400,
      `Gate pass #${pass.passId} was declined by management. Do not release these items.`,
    );
  }
  if (pass.status === "carried_out") {
    throw new ApiError(
      400,
      `Gate pass #${pass.passId} was already carried out on ${pass.carriedOutAt?.toDateString() || "an earlier date"}`,
    );
  }

  // release only after the gate has looked at every single line
  const undecided = pass.items.filter((i) => !i.clearance?.status).length;
  if (undecided > 0) {
    throw new ApiError(
      400,
      `Check every item first: ${undecided} ${undecided === 1 ? "item" : "items"} on pass #${pass.passId} not yet cleared or flagged`,
    );
  }

  const user = await User.findById(requester.id);
  pass.status = "carried_out";
  pass.carriedOutBy = requester.id as any;
  pass.carriedOutByName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "";
  pass.carriedOutAt = new Date();
  await pass.save();

  const flagged = pass.items.filter(
    (i) => i.clearance?.status === "flagged",
  ).length;
  return new ApiResponse(
    200,
    flagged > 0
      ? `Gate pass #${pass.passId} released with ${flagged} ${flagged === 1 ? "item" : "items"} held back`
      : `Gate pass #${pass.passId} marked carried out`,
    pass.toJSON(),
  );
};

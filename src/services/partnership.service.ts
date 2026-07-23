import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import PartnershipRequest from "../models/PartnershipRequest";
import { nextSequence } from "../helpers/sequence";
import {
  sendPartnershipConfirmationMail,
  sendPartnershipNotificationMail,
} from "./nodemailer/mail.service";
import {
  ISubmitPartnershipRequest,
  IUpdatePartnershipStatus,
  IPartnershipsQuery,
} from "../interfaces/partnership.interface";

const NOTIFICATION_EMAIL =
  process.env.CONTACT_NOTIFICATION_EMAIL || "info@kgrpartnersltd.com";
const CONSOLE_URL =
  process.env.CONSOLE_URL || "https://admin.kgrpartnersltd.com";
const PARTNERSHIP_ID_START = Number(process.env.PARTNERSHIP_ID_START) || 100;

// POST /api/partnerships: public. Stores the form, then fires the
// confirmation (to the applicant) and the console pointer (to us)
// without blocking the response.
export const submitPartnershipService = async (
  payload: ISubmitPartnershipRequest,
) => {
  const requestId = await nextSequence("partnership_id", PARTNERSHIP_ID_START);

  // keep only answered fields; empty sections are dropped entirely
  const sections = (payload.sections || [])
    .map((section) => ({
      title: section.title,
      fields: section.fields.filter((f) => f.value.trim() !== ""),
    }))
    .filter((section) => section.fields.length > 0);

  const doc = await PartnershipRequest.create({
    requestId,
    kind: payload.kind,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    sections,
  });

  const answered = sections.reduce((acc, s) => acc + s.fields.length, 0);

  void sendPartnershipConfirmationMail(payload.email, {
    name: payload.name,
    requestId,
  });
  void sendPartnershipNotificationMail(NOTIFICATION_EMAIL, {
    requestId,
    kind: payload.kind,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || "",
    answered,
    consoleUrl: `${CONSOLE_URL}/partnerships`,
  });

  return new ApiResponse(201, "Partnership form received", {
    id: String(doc._id),
    requestId,
  });
};

// GET /api/partnerships (managers)
export const getPartnershipsService = async (query: IPartnershipsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.kind) filter.kind = query.kind;
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [{ name: pattern }, { email: pattern }];
    if (/^\d+$/.test(term)) or.push({ requestId: Number(term) });
    filter.$or = or;
  }

  const [requests, totalItems] = await Promise.all([
    PartnershipRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("handledBy", "firstName lastName"),
    PartnershipRequest.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    requests.map((r) => r.toJSON()),
    totalItems,
    page,
    pageSize,
    "Partnership requests retrieved successfully",
  );
};

// PATCH /api/partnerships/:id/status (managers)
export const updatePartnershipStatusService = async (
  id: string,
  payload: IUpdatePartnershipStatus,
  handledBy: string,
) => {
  const request = await PartnershipRequest.findById(id);
  if (!request) throw new ApiError(404, "Partnership request not found");

  request.status = payload.status;
  request.handledBy = handledBy as any;
  request.handledAt = new Date();
  if (payload.note !== undefined) request.adminNote = payload.note;
  await request.save();

  return new ApiResponse(
    200,
    `Request #${request.requestId} marked ${payload.status.replace("_", " ")}`,
    request.toJSON(),
  );
};

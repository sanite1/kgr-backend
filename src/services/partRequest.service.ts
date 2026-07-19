import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import PartRequest from "../models/PartRequest";
import InventoryItem from "../models/InventoryItem";
import StockMovement from "../models/StockMovement";
import Bus from "../models/Bus";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import { alertIfLowStock } from "../helpers/lowStock";
import { inBackground } from "../helpers/background";
import { upsertSourceExpenditure } from "./expenditure.service";
import { sendRequestDecisionMail } from "./nodemailer/mail.service";

// inventory item category -> expenditure folder
const ITEM_CATEGORY_FOLDER: Record<string, string> = {
  part: "Parts",
  battery: "Batteries",
  consumable: "Consumables",
};
import {
  IPartRequest,
  ICreatePartRequest,
  IDecideRequest,
  IPartRequestsQuery,
  IBusExpenseQuery,
} from "../interfaces/partRequest.interface";

const REQUEST_ID_START = Number(process.env.REQUEST_ID_START) || 1000;

// POST /api/requests
export const createPartRequestService = async (
  payload: ICreatePartRequest,
  requestedBy: string,
) => {
  const bus = await Bus.findById(payload.busId);
  if (!bus) throw new ApiError(404, "Bus not found");

  const item = await InventoryItem.findById(payload.itemId);
  if (!item) throw new ApiError(404, "Item not found");
  if (!item.isActive) {
    throw new ApiError(400, `"${item.name}" is no longer stocked`);
  }

  // the old system's "Expiry | Next Request" gate: an earlier request for
  // this bus+item may have locked re-requests until a date
  if (!payload.allowOverride) {
    const today = dayString();
    const blocking = await PartRequest.findOne({
      bus: bus._id,
      item: item._id,
      status: { $in: ["pending", "approved"] },
      nextRequestDate: { $gt: today },
    }).sort({ createdAt: -1 });
    if (blocking) {
      throw new ApiError(
        409,
        `Request #${blocking.requestId} locks "${item.name}" for ${bus.number} until ${blocking.nextRequestDate}`,
      );
    }
  }

  const requestId = await nextSequence("part_request_id", REQUEST_ID_START);
  const amount = String(payload.quantity * Number(item.unitCost));

  const request = await PartRequest.create({
    requestId,
    bus: bus._id,
    busNumber: bus.number,
    item: item._id,
    itemName: item.name,
    quantity: payload.quantity,
    unitCost: item.unitCost,
    amount,
    narration: payload.narration || "",
    nextRequestDate: payload.nextRequestDate,
    requestedBy,
  });

  return new ApiResponse(
    201,
    `Request #${requestId} submitted`,
    request.toJSON(),
  );
};

// GET /api/requests
export const getPartRequestsService = async (query: IPartRequestsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.busId) filter.bus = query.busId;
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { busNumber: pattern },
      { itemName: pattern },
    ];
    if (/^\d+$/.test(term)) or.push({ requestId: Number(term) });
    filter.$or = or;
  }

  const [requests, totalItems] = await Promise.all([
    PartRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("requestedBy decidedBy", "firstName lastName"),
    PartRequest.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    requests.map((r) => r.toJSON()),
    totalItems,
    page,
    pageSize,
    "Requests retrieved successfully",
  );
};

// POST /api/requests/:id/approve (admin): deducts stock, leaves a movement
export const approvePartRequestService = async (
  id: string,
  payload: IDecideRequest,
  decidedBy: string,
) => {
  const request = await PartRequest.findById(id);
  if (!request) throw new ApiError(404, "Request not found");
  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request #${request.requestId} is already ${request.status}`,
    );
  }

  const item = await InventoryItem.findById(request.item);
  if (!item) throw new ApiError(404, "The requested item no longer exists");
  if (item.quantityOnHand < request.quantity) {
    throw new ApiError(
      400,
      `Insufficient stock: only ${item.quantityOnHand} ${item.unit} of "${item.name}" left`,
    );
  }

  const previousQuantity = item.quantityOnHand;
  item.quantityOnHand -= request.quantity;
  await item.save();

  await StockMovement.create({
    item: item._id,
    type: "out",
    quantity: request.quantity,
    balanceAfter: item.quantityOnHand,
    note: `Request #${request.requestId} for ${request.busNumber}`,
    relatedRequest: request._id,
    by: decidedBy,
  });

  alertIfLowStock(item, previousQuantity);

  request.status = "approved";
  request.decidedBy = decidedBy as any;
  request.decidedAt = new Date();
  request.decisionNote = payload.note || "";
  await request.save();

  // stock left inventory for this bus: book it as an expenditure
  await upsertSourceExpenditure({
    source: "part_request",
    sourceRef: String(request._id),
    status: "completed",
    amount: request.amount,
    categoryName: ITEM_CATEGORY_FOLDER[item.category] || "Spare Parts",
    description: `Request #${request.requestId}: ${request.itemName} x ${request.quantity}`,
    busId: String(request.bus),
    busNumber: request.busNumber,
    recordedBy: decidedBy,
  });

  notifyRequester(request, decidedBy, true);

  return new ApiResponse(
    200,
    `Request #${request.requestId} approved`,
    request.toJSON(),
  );
};

// POST /api/requests/:id/decline (admin)
export const declinePartRequestService = async (
  id: string,
  payload: IDecideRequest,
  decidedBy: string,
) => {
  const request = await PartRequest.findById(id);
  if (!request) throw new ApiError(404, "Request not found");
  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request #${request.requestId} is already ${request.status}`,
    );
  }

  request.status = "declined";
  request.decidedBy = decidedBy as any;
  request.decidedAt = new Date();
  request.decisionNote = payload.note || "";
  await request.save();

  notifyRequester(request, decidedBy, false);

  return new ApiResponse(
    200,
    `Request #${request.requestId} declined`,
    request.toJSON(),
  );
};

// Emails the requester about the decision, unless they decided it
// themselves. Fire-and-forget: lookup and send never block the response.
const notifyRequester = (
  request: IPartRequest,
  decidedBy: string,
  approved: boolean,
): void => {
  if (String(request.requestedBy) === decidedBy) return;
  inBackground(
    (async () => {
      const requester = await User.findById(request.requestedBy);
      if (!requester?.email) return;
      await sendRequestDecisionMail(requester.email, {
        name: requester.firstName,
        requestId: request.requestId,
        itemName: request.itemName,
        quantity: request.quantity,
        busNumber: request.busNumber,
        approved,
        note: request.decisionNote || undefined,
      });
    })().catch(() => undefined),
  );
};

// GET /api/requests/bus-expense: approved spend grouped per bus
export const getBusExpenseService = async (query: IBusExpenseQuery) => {
  const match: Record<string, any> = { status: "approved" };
  if (query.from || query.to) {
    match.decidedAt = {};
    if (query.from) match.decidedAt.$gte = new Date(`${query.from}T00:00:00Z`);
    if (query.to) match.decidedAt.$lte = new Date(`${query.to}T23:59:59Z`);
  }

  const rows = await PartRequest.aggregate([
    { $match: match },
    {
      $group: {
        _id: { bus: "$bus", busNumber: "$busNumber" },
        count: { $sum: 1 },
        total: { $sum: { $toDouble: "$amount" } },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 200 },
  ]);

  return new ApiResponse(200, "Bus expense retrieved successfully", {
    buses: rows.map((r: any) => ({
      busId: String(r._id.bus),
      busNumber: r._id.busNumber,
      count: r.count,
      totalAmount: String(r.total),
    })),
  });
};

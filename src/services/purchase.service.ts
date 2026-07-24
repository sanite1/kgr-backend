import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import PurchaseOrder from "../models/PurchaseOrder";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import {
  ICreatePurchase,
  IUpdatePurchase,
  ISetPurchaseStatus,
  IPurchasesQuery,
  PurchaseStatus,
} from "../interfaces/purchase.interface";

const ORDER_ID_START = Number(process.env.PURCHASE_ORDER_ID_START) || 1;

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  purchased: "purchased",
  shipping: "shipping",
  arrived: "arrived",
  delivered: "delivered",
};

const userName = async (id: string): Promise<string> => {
  const user = await User.findById(id);
  return user ? `${user.firstName} ${user.lastName}`.trim() : "";
};

// POST /api/purchases: register an order the moment it is bought
export const createPurchaseService = async (
  payload: ICreatePurchase,
  createdById: string,
) => {
  const byName = await userName(createdById);
  const orderId = await nextSequence("purchase_order_id", ORDER_ID_START);

  const order = await PurchaseOrder.create({
    orderId,
    title: payload.title.trim(),
    supplier: payload.supplier?.trim() || "",
    quantity: payload.quantity,
    trackingNumber: payload.trackingNumber?.trim() || "",
    expectedArrival: payload.expectedArrival || "",
    notes: payload.notes?.trim() || "",
    status: "purchased",
    history: [
      {
        status: "purchased",
        at: new Date(),
        by: createdById,
        byName,
        note: "Order registered",
      },
    ],
    createdBy: createdById,
    createdByName: byName,
  });

  return new ApiResponse(201, `Order #${orderId} registered`, order.toJSON());
};

// GET /api/purchases
export const getPurchasesService = async (query: IPurchasesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { title: pattern },
      { supplier: pattern },
      { trackingNumber: pattern },
    ];
    if (/^\d+$/.test(term)) or.push({ orderId: Number(term) });
    filter.$or = or;
  }

  const [orders, totalItems, statusRows] = await Promise.all([
    PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    PurchaseOrder.countDocuments(filter),
    // counts across ALL orders, so the board tiles never lie to a filter
    PurchaseOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<string, number> = {
    purchased: 0,
    shipping: 0,
    arrived: 0,
    delivered: 0,
  };
  for (const row of statusRows) counts[row._id] = row.count;

  const result = PaginatedResponse.build(
    orders.map((o) => o.toJSON()),
    totalItems,
    page,
    pageSize,
    "Purchases retrieved successfully",
  );
  // ride the counts alongside the page
  (result as unknown as { extra: Record<string, unknown> }).extra = {
    counts,
  };
  return result;
};

// PATCH /api/purchases/:id: tracking details arrive after the purchase
export const updatePurchaseService = async (
  id: string,
  payload: IUpdatePurchase,
) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new ApiError(404, "Order not found");

  if (payload.trackingNumber !== undefined) {
    order.trackingNumber = payload.trackingNumber.trim();
  }
  if (payload.expectedArrival !== undefined) {
    order.expectedArrival = payload.expectedArrival;
  }
  if (payload.notes !== undefined) order.notes = payload.notes;
  await order.save();

  return new ApiResponse(
    200,
    `Order #${order.orderId} updated`,
    order.toJSON(),
  );
};

// POST /api/purchases/:id/status: move the order along the journey.
// Any stage can be set (corrections happen); every change lands in the
// history with who did it and when.
export const setPurchaseStatusService = async (
  id: string,
  payload: ISetPurchaseStatus,
  byId: string,
) => {
  const order = await PurchaseOrder.findById(id);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.status === payload.status) {
    throw new ApiError(
      400,
      `Order #${order.orderId} is already ${STATUS_LABEL[payload.status]}`,
    );
  }

  const byName = await userName(byId);
  order.status = payload.status;
  order.history.push({
    status: payload.status,
    at: new Date(),
    by: byId as any,
    byName,
    note: payload.note || "",
  });
  await order.save();

  return new ApiResponse(
    200,
    `Order #${order.orderId} marked ${STATUS_LABEL[payload.status]}`,
    order.toJSON(),
  );
};

import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Receipt from "../models/Receipt";
import Bus from "../models/Bus";
import { findCurrentTripPrice } from "./tripPrice.service";
import { nextSequence } from "../helpers/sequence";
import { dayString, lastNDays } from "../helpers/day";
import {
  ICreateReceiptRequest,
  IReceiptsQuery,
  IVoidReceiptRequest,
  IReceiptSummaryQuery,
} from "../interfaces/receipt.interface";

const BILL_ID_START = Number(process.env.RECEIPT_BILL_START) || 20000;

const randomTicketId = (): string =>
  String(Math.floor(10000000 + Math.random() * 90000000));

const uniqueTicketId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomTicketId();
    const clash = await Receipt.findOne({ ticketId: candidate });
    if (!clash) return candidate;
  }
  throw new ApiError(500, "Could not allocate a ticket id, try again");
};

// POST /api/receipts
export const createReceiptService = async (
  payload: ICreateReceiptRequest,
  issuedBy: string,
) => {
  const bus = await Bus.findById(payload.busId);
  if (!bus) throw new ApiError(404, "Bus not found");
  if (!bus.isActive) {
    throw new ApiError(400, `Bus ${bus.number} is deactivated`);
  }

  const price = await findCurrentTripPrice();
  if (!price) {
    throw new ApiError(400, "No trip price configured. Set one first.");
  }

  const date = dayString();

  if (!payload.allowDuplicate) {
    const existing = await Receipt.findOne({
      bus: bus._id,
      date,
      status: { $ne: "void" },
    });
    if (existing) {
      throw new ApiError(
        409,
        `Bus ${bus.number} already has receipt #${existing.billId} today`,
      );
    }
  }

  const billId = await nextSequence("receipt_bill_id", BILL_ID_START);
  const ticketId = await uniqueTicketId();
  const expectedAmount = String(payload.expectedTrips * Number(price.amount));

  const receipt = await Receipt.create({
    billId,
    ticketId,
    bus: bus._id,
    busNumber: bus.number,
    expectedTrips: payload.expectedTrips,
    unitPrice: price.amount,
    expectedAmount,
    date,
    issuedBy,
    checkedIn: !!payload.checkIn,
    checkedInAt: payload.checkIn ? new Date() : undefined,
  });

  return new ApiResponse(201, "Receipt issued successfully", receipt.toJSON());
};

// GET /api/receipts
export const getReceiptsService = async (query: IReceiptsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.busId) filter.bus = query.busId;
  if (query.date) filter.date = query.date;
  if (query.search) {
    const term = query.search.trim();
    const or: Record<string, any>[] = [{ ticketId: term }];
    if (/^\d+$/.test(term)) or.push({ billId: Number(term) });
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    or.push({ busNumber: pattern });
    filter.$or = or;
  }

  const [receipts, totalItems] = await Promise.all([
    Receipt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("issuedBy", "firstName lastName"),
    Receipt.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    receipts.map((r) => r.toJSON()),
    totalItems,
    page,
    pageSize,
    "Receipts retrieved successfully",
  );
};

// GET /api/receipts/:id
export const getReceiptService = async (id: string) => {
  const receipt = await Receipt.findById(id).populate(
    "issuedBy paidBy voidedBy",
    "firstName lastName",
  );
  if (!receipt) throw new ApiError(404, "Receipt not found");
  return new ApiResponse(
    200,
    "Receipt retrieved successfully",
    receipt.toJSON(),
  );
};

// POST /api/receipts/:id/check-in
export const checkInReceiptService = async (id: string) => {
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  if (receipt.status === "void") {
    throw new ApiError(400, "This receipt has been voided");
  }
  if (receipt.checkedIn) {
    throw new ApiError(400, `Bus ${receipt.busNumber} is already checked in`);
  }
  receipt.checkedIn = true;
  receipt.checkedInAt = new Date();
  await receipt.save();
  return new ApiResponse(
    200,
    `Bus ${receipt.busNumber} checked in`,
    receipt.toJSON(),
  );
};

// POST /api/receipts/:id/void (admin)
export const voidReceiptService = async (
  id: string,
  payload: IVoidReceiptRequest,
  voidedBy: string,
) => {
  const receipt = await Receipt.findById(id);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  if (receipt.status === "void") {
    throw new ApiError(400, "Receipt is already void");
  }
  if (receipt.status === "paid") {
    throw new ApiError(400, "Paid receipts cannot be voided");
  }
  receipt.status = "void";
  receipt.voidedAt = new Date();
  receipt.voidedBy = voidedBy as any;
  receipt.voidReason = payload.reason;
  await receipt.save();
  return new ApiResponse(
    200,
    `Receipt #${receipt.billId} voided`,
    receipt.toJSON(),
  );
};

// GET /api/receipts/summary: dashboard figures for one day + a 7-day trend
export const getReceiptSummaryService = async (query: IReceiptSummaryQuery) => {
  const date = query.date || dayString();
  const days = lastNDays(7);

  const [dayAgg, seriesAgg] = await Promise.all([
    Receipt.aggregate([
      { $match: { date } },
      {
        $group: {
          _id: null,
          issuedCount: {
            $sum: { $cond: [{ $ne: ["$status", "void"] }, 1, 0] },
          },
          expected: {
            $sum: {
              $cond: [
                { $ne: ["$status", "void"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
          trips: {
            $sum: {
              $cond: [{ $ne: ["$status", "void"] }, "$expectedTrips", 0],
            },
          },
          checkedIn: {
            $sum: {
              $cond: [
                {
                  $and: ["$checkedIn", { $ne: ["$status", "void"] }],
                },
                1,
                0,
              ],
            },
          },
          awaitingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "awaiting_payment"] }, 1, 0],
            },
          },
        },
      },
    ]),
    Receipt.aggregate([
      { $match: { date: { $in: days } } },
      {
        $group: {
          _id: "$date",
          expected: {
            $sum: {
              $cond: [
                { $ne: ["$status", "void"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
          collected: {
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const agg = dayAgg[0] || {
    issuedCount: 0,
    expected: 0,
    collected: 0,
    trips: 0,
    checkedIn: 0,
    awaitingCount: 0,
  };

  const seriesByDate = new Map(seriesAgg.map((s: any) => [s._id, s]));
  const series = days.map((d) => {
    const s = seriesByDate.get(d);
    return {
      date: d,
      expectedAmount: String(s?.expected ?? 0),
      collectedAmount: String(s?.collected ?? 0),
    };
  });

  return new ApiResponse(200, "Summary retrieved successfully", {
    date,
    issuedCount: agg.issuedCount,
    expectedAmount: String(agg.expected),
    collectedAmount: String(agg.collected),
    outstandingAmount: String(agg.expected - agg.collected),
    trips: agg.trips,
    checkedIn: agg.checkedIn,
    awaitingCount: agg.awaitingCount,
    series,
  });
};

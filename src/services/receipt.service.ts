import { Types } from "mongoose";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Receipt from "../models/Receipt";
import Payment from "../models/Payment";
import Bus from "../models/Bus";
import Battery from "../models/Battery";
import { findCurrentTripPrice } from "./tripPrice.service";
import { nextSequence } from "../helpers/sequence";
import { dayString, lastNDays } from "../helpers/day";
import { MANAGERS } from "../config/roles";
import { UserRole } from "../interfaces/helper.interface";
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
  // round to kobo so fractional trips never yield float artifacts
  const expectedAmount = String(
    Math.round(payload.expectedTrips * Number(price.amount) * 100) / 100,
  );

  const receipt = await Receipt.create({
    billId,
    ticketId,
    bus: bus._id,
    busNumber: bus.number,
    batteryName: payload.batteryName.trim(),
    batteryPercent: payload.batteryPercent,
    voltage: payload.voltage ?? 0,
    timeOut: payload.timeOut,
    expectedTrips: payload.expectedTrips,
    unitPrice: price.amount,
    expectedAmount,
    date,
    issuedBy,
    checkedIn: !!payload.checkIn,
    checkedInAt: payload.checkIn ? new Date() : undefined,
    checkedInBy: payload.checkIn ? issuedBy : undefined,
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

  // newest first: latest business day, then latest issue within the day,
  // billId as a stable tiebreaker for same-moment rows (seeds, imports)
  const sort: Record<string, 1 | -1> =
    query.sort === "oldest"
      ? { date: 1, createdAt: 1, billId: 1 }
      : { date: -1, createdAt: -1, billId: -1 };

  const [receipts, totalItems] = await Promise.all([
    Receipt.find(filter)
      .sort(sort)
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
    "issuedBy paidBy voidedBy checkedInBy",
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
export const checkInReceiptService = async (id: string, by: string) => {
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
  receipt.checkedInBy = by as any;
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

// GET /api/receipts/outstanding-summary: the NYP list's aging banner
export const getOutstandingSummaryService = async () => {
  const today = dayString();
  const byDate = await Receipt.aggregate([
    { $match: { status: "awaiting_payment" } },
    {
      $group: {
        _id: "$date",
        count: { $sum: 1 },
        amount: { $sum: { $toDouble: "$expectedAmount" } },
      },
    },
  ]);

  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets = {
    d0_7: { count: 0, amount: 0 },
    d8_30: { count: 0, amount: 0 },
    d30plus: { count: 0, amount: 0 },
  };
  let count = 0;
  let amount = 0;

  for (const row of byDate) {
    const ageDays = Math.max(
      0,
      Math.round(
        (todayMs - new Date(`${row._id}T00:00:00Z`).getTime()) / dayMs,
      ),
    );
    const bucket =
      ageDays <= 7
        ? buckets.d0_7
        : ageDays <= 30
          ? buckets.d8_30
          : buckets.d30plus;
    bucket.count += row.count;
    bucket.amount += row.amount;
    count += row.count;
    amount += row.amount;
  }

  return new ApiResponse(200, "Outstanding summary retrieved successfully", {
    count,
    totalAmount: String(amount),
    buckets: {
      d0_7: { count: buckets.d0_7.count, amount: String(buckets.d0_7.amount) },
      d8_30: {
        count: buckets.d8_30.count,
        amount: String(buckets.d8_30.amount),
      },
      d30plus: {
        count: buckets.d30plus.count,
        amount: String(buckets.d30plus.amount),
      },
    },
  });
};

// Personal dashboard for non-managers: only the requester's own
// figures. A cashier never sees the whole yard's money or a colleague's
// collections; the numbers are scoped to them on the server, not hidden
// on the client.
const getPersonalSummary = async (
  userId: string,
  date: string,
  days: string[],
): Promise<ApiResponse<Record<string, unknown>>> => {
  const uid = new Types.ObjectId(userId);

  const [payToday, receiptsToday, paySeries, checkedInToday] =
    await Promise.all([
      Payment.aggregate([
        { $match: { collectedBy: uid, date } },
        { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } },
      ]),
      Receipt.aggregate([
        { $match: { issuedBy: uid, date, status: { $ne: "void" } } },
        {
          $group: {
            _id: null,
            issued: { $sum: 1 },
            buses: { $addToSet: "$bus" },
            trips: { $sum: "$expectedTrips" },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { collectedBy: uid, date: { $in: days } } },
        {
          $group: {
            _id: "$date",
            collected: { $sum: { $toDouble: "$amount" } },
          },
        },
      ]),
      Receipt.countDocuments({ checkedInBy: uid, date }),
    ]);

  const r = receiptsToday[0] || { issued: 0, buses: [], trips: 0 };
  const seriesByDate = new Map(paySeries.map((s: any) => [s._id, s.collected]));

  return new ApiResponse(200, "Summary retrieved successfully", {
    scope: "personal",
    date,
    myCollectedToday: String(payToday[0]?.total ?? 0),
    myReceiptsToday: r.issued,
    myBusesToday: r.buses.length,
    myTripsToday: r.trips,
    myCheckedInToday: checkedInToday,
    series: days.map((d) => ({
      date: d,
      collectedAmount: String(seriesByDate.get(d) ?? 0),
      expectedAmount: "0",
    })),
  });
};

// GET /api/receipts/summary: dashboard figures, scoped by role.
// Managers/admin get the whole yard for one day, the running month and
// a 7-day trend; everyone else gets only their own figures.
export const getReceiptSummaryService = async (
  query: IReceiptSummaryQuery,
  user: { id: string; role: UserRole },
): Promise<ApiResponse<Record<string, unknown>>> => {
  const date = query.date || dayString();
  const days = lastNDays(7);

  if (!MANAGERS.includes(user.role)) {
    return getPersonalSummary(user.id, date, days);
  }

  const monthPrefix = new RegExp(`^${date.slice(0, 7)}-`);

  const [
    dayAgg,
    seriesAgg,
    monthAgg,
    busesActive,
    workingBusIds,
    batteriesTotal,
    workingBatteryNames,
  ] = await Promise.all([
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
    Receipt.aggregate([
      { $match: { date: monthPrefix } },
      {
        $group: {
          _id: null,
          issued: { $sum: { $cond: [{ $ne: ["$status", "void"] }, 1, 0] } },
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
        },
      },
    ]),
    // total active fleet, and the buses that actually went out today
    // (a bus works only if it has a non-void receipt - its gate ticket)
    Bus.countDocuments({ isActive: true }),
    Receipt.distinct("bus", { date, status: { $ne: "void" } }),
    // same working/idle split for batteries: a pack works today if a
    // receipt named it, since the receipt is what sends it out the gate
    Battery.countDocuments({ isActive: true }),
    Receipt.distinct("batteryName", {
      date,
      status: { $ne: "void" },
      batteryName: { $nin: ["", null] },
    }),
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

  const month = monthAgg[0] || { issued: 0, collected: 0, trips: 0 };
  const busesWorkingToday = workingBusIds.length;
  const batteriesWorkingToday = workingBatteryNames.length;

  return new ApiResponse(200, "Summary retrieved successfully", {
    scope: "global",
    date,
    issuedCount: agg.issuedCount,
    expectedAmount: String(agg.expected),
    collectedAmount: String(agg.collected),
    outstandingAmount: String(agg.expected - agg.collected),
    trips: agg.trips,
    checkedIn: agg.checkedIn,
    awaitingCount: agg.awaitingCount,
    monthCollected: String(month.collected),
    monthIssuedCount: month.issued,
    monthTrips: month.trips,
    busesActive,
    busesWorkingToday,
    busesIdleToday: Math.max(0, busesActive - busesWorkingToday),
    batteriesWorkingToday,
    batteriesIdleToday: Math.max(0, batteriesTotal - batteriesWorkingToday),
    series,
  });
};

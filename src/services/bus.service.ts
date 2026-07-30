import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Bus from "../models/Bus";
import Receipt from "../models/Receipt";
import { dayString } from "../helpers/day";
import {
  ICreateBusRequest,
  IUpdateBusRequest,
  IBusesQuery,
  IBusTripsQuery,
} from "../interfaces/bus.interface";

// "a37" / "A  37" / "A37" all normalize to "A 37" so the registry
// never fragments on formatting differences.
export const normalizeBusNumber = (raw: string): string => {
  const compact = raw.toUpperCase().replace(/\s+/g, "");
  const match = /^([A-Z]+)(\d+)$/.exec(compact);
  if (match) return `${match[1]} ${match[2]}`;
  return raw.toUpperCase().trim().replace(/\s+/g, " ");
};

// POST /api/buses
export const createBusService = async (
  payload: ICreateBusRequest,
  createdBy: string,
) => {
  const number = normalizeBusNumber(payload.number);
  const existing = await Bus.findOne({ number });
  if (existing) {
    throw new ApiError(409, `Bus ${number} is already registered`);
  }

  const bus = await Bus.create({
    number,
    driverName: payload.driverName || "",
    driverPhone: payload.driverPhone || "",
    notes: payload.notes || "",
    createdBy,
  });

  return new ApiResponse(201, "Bus registered successfully", bus.toJSON());
};

// GET /api/buses
export const getBusesService = async (query: IBusesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ number: pattern }, { driverName: pattern }];
  }

  const [buses, totalItems] = await Promise.all([
    Bus.find(filter)
      .sort({ number: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Bus.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    buses.map((b) => b.toJSON()),
    totalItems,
    page,
    pageSize,
    "Buses retrieved successfully",
  );
};

// GET /api/buses/:id
export const getBusService = async (id: string) => {
  const bus = await Bus.findById(id);
  if (!bus) throw new ApiError(404, "Bus not found");
  return new ApiResponse(200, "Bus retrieved successfully", bus.toJSON());
};

// GET /api/buses/:id/trips: one bus's whole trip story. Every generated
// receipt for the bus IS a trip record, so the summaries and the table
// both come straight from receipts. Voided receipts never count.
export const getBusTripsService = async (id: string, query: IBusTripsQuery) => {
  const bus = await Bus.findById(id);
  if (!bus) throw new ApiError(404, "Bus not found");

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const base = { bus: bus._id, status: { $ne: "void" } };
  const rangeFilter: Record<string, any> = { ...base };
  if (query.from || query.to) {
    rangeFilter.date = {};
    if (query.from) rangeFilter.date.$gte = query.from;
    if (query.to) rangeFilter.date.$lte = query.to;
  }

  const today = dayString();
  const monthPrefix = new RegExp(`^${today.slice(0, 7)}-`);

  const sumStage = {
    $group: {
      _id: null,
      trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
      receipts: { $sum: 1 },
      expected: { $sum: { $toDouble: "$expectedAmount" } },
      collected: { $sum: { $toDouble: { $ifNull: ["$amountPaid", "0"] } } },
    },
  };

  const [allAgg, todayAgg, monthAgg, rangeAgg, receipts, totalItems] =
    await Promise.all([
      Receipt.aggregate([{ $match: base }, sumStage]),
      Receipt.aggregate([{ $match: { ...base, date: today } }, sumStage]),
      Receipt.aggregate([{ $match: { ...base, date: monthPrefix } }, sumStage]),
      Receipt.aggregate([{ $match: rangeFilter }, sumStage]),
      Receipt.find(rangeFilter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select(
          "billId ticketId date expectedTrips batteryName expectedAmount amountPaid status createdAt issuedBy",
        )
        .populate("issuedBy", "firstName lastName"),
      Receipt.countDocuments(rangeFilter),
    ]);

  const round = (n: number) => Math.round(n * 2) / 2;
  const pick = (agg: any[]) => {
    const row = agg[0] || { trips: 0, receipts: 0, expected: 0, collected: 0 };
    return {
      trips: round(row.trips),
      receipts: row.receipts,
      expectedAmount: String(row.expected),
      collectedAmount: String(row.collected),
    };
  };

  return new ApiResponse(200, "Bus trips retrieved successfully", {
    bus: bus.toJSON(),
    summary: {
      today: pick(todayAgg),
      thisMonth: pick(monthAgg),
      allTime: pick(allAgg),
      range: pick(rangeAgg),
    },
    receipts: receipts.map((r) => r.toJSON()),
    pagination: PaginatedResponse.buildPagination(page, pageSize, totalItems),
  });
};

// PATCH /api/buses/:id
export const updateBusService = async (
  id: string,
  payload: IUpdateBusRequest,
  updatedBy: string,
) => {
  const bus = await Bus.findById(id);
  if (!bus) throw new ApiError(404, "Bus not found");

  if (payload.number !== undefined) {
    const number = normalizeBusNumber(payload.number);
    const clash = await Bus.findOne({ number, _id: { $ne: bus._id } });
    if (clash) throw new ApiError(409, `Bus ${number} is already registered`);
    bus.number = number;
  }
  if (payload.driverName !== undefined) bus.driverName = payload.driverName;
  if (payload.driverPhone !== undefined) bus.driverPhone = payload.driverPhone;
  if (payload.isActive !== undefined) bus.isActive = payload.isActive;
  if (payload.hasTracker !== undefined) bus.hasTracker = payload.hasTracker;
  if (payload.trackerHealth !== undefined) {
    bus.trackerHealth = payload.trackerHealth;
  }
  if (payload.notes !== undefined) bus.notes = payload.notes;
  bus.updatedBy = updatedBy as any;
  await bus.save();

  return new ApiResponse(200, "Bus updated successfully", bus.toJSON());
};

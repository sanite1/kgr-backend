import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Bus from "../models/Bus";
import { MANAGERS } from "../config/roles";
import RepairJob from "../models/RepairJob";
import PartRequest from "../models/PartRequest";
import Expenditure from "../models/Expenditure";
import BatterySwap from "../models/BatterySwap";
import Receipt from "../models/Receipt";
import { dayString } from "../helpers/day";
import {
  ICreateBusRequest,
  IUpdateBusRequest,
  IBusesQuery,
  IBusPerformanceQuery,
  IBusTripsQuery,
  PerformanceBand,
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
export const getBusesService = async (query: IBusesQuery, role?: string) => {
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

  // costs are management's view; others get the plain list
  const showMoney = role && (MANAGERS as string[]).includes(role);
  const ids = buses.map((b) => b._id);
  const [openRows, costRows] = showMoney
    ? await Promise.all([
        RepairJob.aggregate([
          { $match: { bus: { $in: ids }, status: "open" } },
          { $group: { _id: "$bus", count: { $sum: 1 } } },
        ]),
        Expenditure.aggregate([
          { $match: { bus: { $in: ids }, status: { $ne: "cancelled" } } },
          {
            $group: { _id: "$bus", total: { $sum: { $toDouble: "$amount" } } },
          },
        ]),
      ])
    : [[], []];
  const openBy = new Map(openRows.map((r: any) => [String(r._id), r.count]));
  const costBy = new Map(costRows.map((r: any) => [String(r._id), r.total]));

  return PaginatedResponse.build(
    buses.map((b) => ({
      ...b.toJSON(),
      maintenance: showMoney
        ? {
            openRepairs: openBy.get(String(b._id)) ?? 0,
            cost: String(
              Math.round((costBy.get(String(b._id)) ?? 0) * 100) / 100,
            ),
          }
        : undefined,
    })),
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

// GET /api/buses/:id/maintenance (managers): everything ever done to
// one bus, in one place. Costs come from the bus's expenditures, which
// already carry every closed repair and approved request, so nothing is
// counted twice; open repairs ride along as committed cost-in-progress.
export const getBusMaintenanceService = async (id: string) => {
  const bus = await Bus.findById(id);
  if (!bus) throw new ApiError(404, "Bus not found");

  const [repairs, requests, expenditures, swaps, costAgg] = await Promise.all([
    RepairJob.find({ bus: bus._id }).sort({ createdAt: -1 }).limit(25),
    PartRequest.find({ bus: bus._id }).sort({ createdAt: -1 }).limit(25),
    // hand-entered expenses only: repair and request money already
    // appears as its own timeline events
    Expenditure.find({
      bus: bus._id,
      status: { $ne: "cancelled" },
      sourceRef: { $exists: false },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(25),
    BatterySwap.find({ bus: bus._id }).sort({ createdAt: -1 }).limit(15),
    Expenditure.aggregate([
      { $match: { bus: bus._id, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } },
    ]),
  ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let workshopDays = 0;
  for (const job of repairs) {
    if (job.status === "cancelled") continue;
    const opened = job.createdAt?.getTime() ?? now;
    const closed = job.closedAt?.getTime() ?? now;
    workshopDays += Math.max(1, Math.ceil((closed - opened) / dayMs));
  }

  const iso = (d?: Date) => (d ? d.toISOString() : "");
  type TimelineEvent = {
    type: "repair" | "request" | "expenditure" | "swap";
    at: string;
    title: string;
    detail: string;
    amount?: string;
    status?: string;
  };
  const events: TimelineEvent[] = [
    ...repairs.map((j) => ({
      type: "repair" as const,
      at: iso(j.createdAt),
      title: `Repair #${j.jobId}: ${j.title}`,
      detail: [
        j.parts.length > 0 ? `${j.parts.length} part(s)` : "",
        j.closedAt ? `closed ${iso(j.closedAt).slice(0, 10)}` : "still open",
        j.closeNote || j.description || "",
      ]
        .filter(Boolean)
        .join(" · "),
      amount: j.totalCost,
      status: j.status,
    })),
    ...requests.map((r) => ({
      type: "request" as const,
      at: iso(r.createdAt),
      title: `Request #${r.requestId}: ${r.itemName} × ${r.quantity}`,
      detail: r.narration || "",
      amount: r.amount,
      status: r.status,
    })),
    ...expenditures.map((e) => ({
      type: "expenditure" as const,
      at: e.date ? `${e.date}T12:00:00.000Z` : iso(e.createdAt),
      title: e.description || "Expenditure",
      detail: "",
      amount: e.amount,
      status: e.status,
    })),
    ...swaps.map((sw) => ({
      type: "swap" as const,
      at: iso(sw.createdAt),
      title: `Swap #${sw.swapId}: ${sw.suppliedBatteryCode} on, ${sw.initialBatteryCode} off`,
      detail: sw.note || "",
      status: undefined,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 40);

  const lastRepair = repairs.find((j) => j.status !== "cancelled");

  return new ApiResponse(200, "Bus maintenance retrieved successfully", {
    bus: { _id: String(bus._id), number: bus.number },
    totals: {
      repairs: repairs.length,
      openRepairs: repairs.filter((j) => j.status === "open").length,
      maintenanceCost: String(Math.round((costAgg[0]?.total ?? 0) * 100) / 100),
      workshopDays,
      lastRepairAt: lastRepair?.createdAt ?? null,
    },
    events,
  });
};

// GET /api/buses/performance: every bus judged against the daily trip
// minimum for a period. The measure is average trips per WORKING day
// (days the bus took a receipt), so a bus parked for repairs is not
// unfairly painted red; buses that never worked get their own band.
export const getBusPerformanceService = async (
  query: IBusPerformanceQuery,
  role?: string,
) => {
  const MIN_TRIPS_PER_DAY = 3;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const busFilter: Record<string, any> = {};
  if (query.isActive === "true") busFilter.isActive = true;
  if (query.isActive === "false") busFilter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    busFilter.$or = [{ number: pattern }, { driverName: pattern }];
  }

  const receiptMatch: Record<string, any> = { status: { $ne: "void" } };
  if (query.from || query.to) {
    receiptMatch.date = {};
    if (query.from) receiptMatch.date.$gte = query.from;
    if (query.to) receiptMatch.date.$lte = query.to;
  }

  const [buses, agg] = await Promise.all([
    Bus.find(busFilter).sort({ number: 1 }),
    Receipt.aggregate([
      { $match: receiptMatch },
      {
        $group: {
          _id: "$bus",
          trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
          days: { $addToSet: "$date" },
        },
      },
    ]),
  ]);

  const perf = new Map<string, { trips: number; days: number }>(
    agg.map((a: any) => [
      String(a._id),
      { trips: a.trips, days: (a.days ?? []).length },
    ]),
  );

  const round = (n: number) => Math.round(n * 2) / 2;
  const rows = buses.map((bus) => {
    const p = perf.get(String(bus._id));
    const trips = round(p?.trips ?? 0);
    const daysWorked = p?.days ?? 0;
    const avg = daysWorked > 0 ? trips / daysWorked : 0;
    const band: PerformanceBand =
      daysWorked === 0
        ? "idle"
        : avg < MIN_TRIPS_PER_DAY
          ? "under"
          : avg === MIN_TRIPS_PER_DAY
            ? "average"
            : "good";
    return {
      ...bus.toJSON(),
      trips,
      daysWorked,
      avgTripsPerDay: Math.round(avg * 100) / 100,
      band,
      maintenance: undefined as
        { openRepairs: number; cost: string } | undefined,
    };
  });

  // why a bus underperforms often sits in the workshop: managers see
  // each bus's open repairs and lifetime maintenance spend on the list
  if (role && (MANAGERS as string[]).includes(role)) {
    const ids = rows.map((r) => r._id);
    const [openRows, costRows] = await Promise.all([
      RepairJob.aggregate([
        { $match: { bus: { $in: ids }, status: "open" } },
        { $group: { _id: "$bus", count: { $sum: 1 } } },
      ]),
      Expenditure.aggregate([
        { $match: { bus: { $in: ids }, status: { $ne: "cancelled" } } },
        { $group: { _id: "$bus", total: { $sum: { $toDouble: "$amount" } } } },
      ]),
    ]);
    const openBy = new Map(openRows.map((r: any) => [String(r._id), r.count]));
    const costBy = new Map(costRows.map((r: any) => [String(r._id), r.total]));
    for (const row of rows) {
      row.maintenance = {
        openRepairs: openBy.get(String(row._id)) ?? 0,
        cost: String(
          Math.round((costBy.get(String(row._id)) ?? 0) * 100) / 100,
        ),
      };
    }
  }

  const summary = {
    minTripsPerDay: MIN_TRIPS_PER_DAY,
    fleetTrips: round(rows.reduce((sum, r) => sum + r.trips, 0)),
    busesWorked: rows.filter((r) => r.daysWorked > 0).length,
    good: rows.filter((r) => r.band === "good").length,
    average: rows.filter((r) => r.band === "average").length,
    under: rows.filter((r) => r.band === "under").length,
    idle: rows.filter((r) => r.band === "idle").length,
  };

  const band = query.band && query.band !== "all" ? query.band : null;
  const filtered = band ? rows.filter((r) => r.band === band) : rows;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return new ApiResponse(200, "Fleet performance retrieved successfully", {
    summary,
    buses: paged,
    pagination: PaginatedResponse.buildPagination(
      page,
      pageSize,
      filtered.length,
    ),
  });
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

  // each bus should make at least this many trips every working day;
  // days below it are painted red on the page
  const MIN_TRIPS_PER_DAY = 3;

  const [allAgg, todayAgg, monthAgg, rangeAgg, daysAgg, receipts, totalItems] =
    await Promise.all([
      Receipt.aggregate([{ $match: base }, sumStage]),
      Receipt.aggregate([{ $match: { ...base, date: today } }, sumStage]),
      Receipt.aggregate([{ $match: { ...base, date: monthPrefix } }, sumStage]),
      Receipt.aggregate([{ $match: rangeFilter }, sumStage]),
      Receipt.aggregate([
        { $match: rangeFilter },
        {
          $group: {
            _id: "$date",
            trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
            receipts: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
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

  const days = daysAgg.map((d: any) => ({
    date: d._id as string,
    trips: round(d.trips),
    receipts: d.receipts as number,
  }));

  return new ApiResponse(200, "Bus trips retrieved successfully", {
    bus: bus.toJSON(),
    summary: {
      today: pick(todayAgg),
      thisMonth: pick(monthAgg),
      allTime: pick(allAgg),
      range: pick(rangeAgg),
    },
    minTripsPerDay: MIN_TRIPS_PER_DAY,
    days,
    lowTripDays: days.filter((d) => d.trips < MIN_TRIPS_PER_DAY).length,
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

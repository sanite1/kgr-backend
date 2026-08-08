import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryMovement from "../models/BatteryMovement";
import BatteryAttendanceEntry from "../models/BatteryAttendanceEntry";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import BatterySwap from "../models/BatterySwap";
import Receipt from "../models/Receipt";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { lastSightingsMap, canonBattery } from "../helpers/batterySighting";
import {
  ICreateBattery,
  IUpdateBattery,
  ISetBatteryStatus,
  IBatteriesQuery,
  IBatteryMovementsQuery,
} from "../interfaces/battery.interface";

const STATUS_LABEL: Record<string, string> = {
  active: "active",
  faulty: "faulty",
  charging: "charging",
  fully_charged: "fully charged",
  not_charged: "not charged",
  not_in_use: "not in use",
};

// POST /api/batteries (admin)
export const createBatteryService = async (
  payload: ICreateBattery,
  createdBy: string,
) => {
  const code = payload.code.trim().toUpperCase();

  const existing = await Battery.findOne({ code });
  if (existing) {
    throw new ApiError(409, `Battery "${code}" is already registered`);
  }

  const status = payload.status || "active";
  const battery = await Battery.create({
    code,
    status,
    notes: payload.notes || "",
    createdBy,
  });

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "status",
    fromStatus: status,
    toStatus: status,
    note: "Battery registered",
    by: createdBy,
  });

  return new ApiResponse(
    201,
    `Battery ${battery.code} registered`,
    battery.toJSON(),
  );
};

// GET /api/batteries
export const getBatteriesService = async (query: IBatteriesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.code = pattern;
  }

  const today = dayString();
  const [batteries, totalItems, sightings, monthRows] = await Promise.all([
    Battery.find(filter)
      .sort({ code: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Battery.countDocuments(filter),
    lastSightingsMap(),
    // this month's trips per typed battery name; canon-summed below so
    // "SUB 16" and "sub16" land on the same pack
    Receipt.aggregate([
      {
        $match: {
          status: { $ne: "void" },
          date: new RegExp(`^${today.slice(0, 7)}-`),
          batteryName: { $nin: ["", null] },
        },
      },
      {
        $group: {
          _id: { name: "$batteryName", date: "$date" },
          trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
        },
      },
    ]),
  ]);

  const tripsToday = new Map<string, number>();
  const tripsMonth = new Map<string, number>();
  for (const row of monthRows) {
    const key = canonBattery(row._id.name);
    tripsMonth.set(key, (tripsMonth.get(key) ?? 0) + row.trips);
    if (row._id.date === today) {
      tripsToday.set(key, (tripsToday.get(key) ?? 0) + row.trips);
    }
  }
  const half = (n: number) => Math.round(n * 2) / 2;

  return PaginatedResponse.build(
    batteries.map((b) => {
      const key = canonBattery(b.code);
      return {
        ...b.toJSON(),
        lastSeen: sightings.get(key) ?? null,
        trips: {
          today: half(tripsToday.get(key) ?? 0),
          month: half(tripsMonth.get(key) ?? 0),
        },
      };
    }),
    totalItems,
    page,
    pageSize,
    "Batteries retrieved successfully",
  );
};

// GET /api/batteries/summary: counts per status for the board header
export const getBatterySummaryService = async () => {
  const [rows, receiptBatteries] = await Promise.all([
    Battery.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // "on buses" comes from today's receipts: generating a receipt names
    // the battery that went out with the bus, so distinct names on the
    // day's live receipts ARE the packs on the road right now
    Receipt.distinct("batteryName", {
      date: dayString(),
      status: { $ne: "void" },
      batteryName: { $nin: ["", null] },
    }),
  ]);
  const onBus = receiptBatteries.length;

  const counts: Record<string, number> = {
    active: 0,
    faulty: 0,
    charging: 0,
    fully_charged: 0,
    not_charged: 0,
    not_in_use: 0,
  };
  let total = 0;
  for (const row of rows) {
    counts[row._id] = row.count;
    total += row.count;
  }

  return new ApiResponse(200, "Battery summary retrieved successfully", {
    counts,
    total,
    onBus,
  });
};

// GET /api/batteries/idle: packs with no receipt for 48h+ (managers).
// A battery "works" when a non-void receipt names it, so consecutive idle
// time is simply the gap since the last receipt that carried its code.
export const getIdleBatteriesService = async () => {
  const THRESHOLD_DAYS = 2; // 48 hours in business days

  const [batteries, lastWorkedRows] = await Promise.all([
    Battery.find({ isActive: true }).sort({ code: 1 }),
    Receipt.aggregate([
      {
        $match: {
          status: { $ne: "void" },
          batteryName: { $nin: ["", null] },
        },
      },
      { $group: { _id: "$batteryName", lastDate: { $max: "$date" } } },
    ]),
  ]);

  const lastByCode = new Map<string, string>(
    lastWorkedRows.map((r: any) => [r._id, r.lastDate]),
  );
  const todayMs = Date.parse(`${dayString()}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();

  const idle: Record<string, any>[] = [];
  const snoozed: Record<string, any>[] = [];
  for (const battery of batteries) {
    const lastWorkedDate = lastByCode.get(battery.code) ?? null;
    // a pack that never worked has been idle since it was registered
    const sinceMs = lastWorkedDate
      ? Date.parse(`${lastWorkedDate}T00:00:00Z`)
      : (battery.createdAt?.getTime() ?? todayMs);
    const idleDays = Math.floor((todayMs - sinceMs) / dayMs);
    if (idleDays < THRESHOLD_DAYS) continue;

    const row = {
      _id: battery._id,
      code: battery.code,
      status: battery.status,
      location: battery.location,
      needsCheck: battery.needsCheck,
      lastWorkedDate,
      idleDays,
      snoozedUntil: battery.idleSnoozedUntil ?? null,
      snoozedByName: battery.idleSnoozedByName ?? "",
    };
    // a live snooze parks the pack aside; expiry brings it back by itself
    if (battery.idleSnoozedUntil && battery.idleSnoozedUntil > now) {
      snoozed.push(row);
    } else {
      idle.push(row);
    }
  }

  idle.sort((a, b) => b.idleDays - a.idleDays);
  snoozed.sort(
    (a, b) =>
      new Date(a.snoozedUntil).getTime() - new Date(b.snoozedUntil).getTime(),
  );

  return new ApiResponse(200, "Idle batteries retrieved successfully", {
    batteries: idle,
    count: idle.length,
    snoozed,
    snoozedCount: snoozed.length,
    thresholdHours: 48,
  });
};

// POST /api/batteries/:id/snooze: park a pack out of the idle warning
// for 1 to 31 days (0 wakes it immediately). It returns on its own when
// the time passes; nothing to clean up.
export const snoozeBatteryService = async (
  id: string,
  days: number,
  byId: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  if (days === 0) {
    battery.idleSnoozedUntil = undefined;
    battery.idleSnoozedByName = undefined;
    await battery.save();
    return new ApiResponse(
      200,
      `${battery.code} is back on the idle watch`,
      battery.toJSON(),
    );
  }

  const user = await User.findById(byId);
  battery.idleSnoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  battery.idleSnoozedByName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "";
  await battery.save();

  return new ApiResponse(
    200,
    `${battery.code} snoozed for ${days} day${days === 1 ? "" : "s"}`,
    battery.toJSON(),
  );
};

// PATCH /api/batteries/:id (admin)
export const updateBatteryService = async (
  id: string,
  payload: IUpdateBattery,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  // notable edits land in the movement history with the editor's name
  const changes: string[] = [];

  if (payload.code !== undefined) {
    const code = payload.code.trim().toUpperCase();
    const clash = await Battery.findOne({ code, _id: { $ne: battery._id } });
    if (clash) throw new ApiError(409, `Battery "${code}" already exists`);
    if (code !== battery.code) {
      changes.push(`Relabelled ${battery.code} as ${code}`);
    }
    battery.code = code;
  }
  if (payload.notes !== undefined) battery.notes = payload.notes;
  if (payload.location !== undefined && payload.location !== battery.location) {
    changes.push(`Moved to ${payload.location.replace(/_/g, " ")}`);
    battery.location = payload.location;
  }
  if (payload.needsCheck !== undefined) battery.needsCheck = payload.needsCheck;
  if (payload.isActive !== undefined) {
    if (payload.isActive !== battery.isActive) {
      changes.push(
        payload.isActive ? "Battery reactivated" : "Battery retired",
      );
    }
    battery.isActive = payload.isActive;
    // a reactivated pack is back in the fleet with no retire reason
    if (payload.isActive === true) battery.retiredReason = undefined;
  }
  if (payload.retiredReason !== undefined && battery.isActive === false) {
    battery.retiredReason = payload.retiredReason;
  }

  await battery.save();

  if (changes.length > 0) {
    await BatteryMovement.create({
      battery: battery._id,
      batteryCode: battery.code,
      action: "status",
      fromStatus: battery.status,
      toStatus: battery.status,
      note: changes.join("; "),
      by,
    });
  }
  return new ApiResponse(
    200,
    `Battery ${battery.code} updated`,
    battery.toJSON(),
  );
};

// POST /api/batteries/:id/status: set the pack's state
export const setBatteryStatusService = async (
  id: string,
  payload: ISetBatteryStatus,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");
  if (battery.status === payload.to) {
    throw new ApiError(
      400,
      `${battery.code} is already ${STATUS_LABEL[payload.to]}`,
    );
  }

  const fromStatus = battery.status;
  battery.status = payload.to;
  await battery.save();

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "status",
    fromStatus,
    toStatus: payload.to,
    note: payload.note || "",
    by,
  });

  return new ApiResponse(
    200,
    `${battery.code} marked ${STATUS_LABEL[payload.to]}`,
    battery.toJSON(),
  );
};

// GET /api/batteries/:id/movements
export const getBatteryMovementsService = async (
  id: string,
  query: IBatteryMovementsQuery,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [movements, totalItems] = await Promise.all([
    BatteryMovement.find({ battery: battery._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("by", "firstName lastName"),
    BatteryMovement.countDocuments({ battery: battery._id }),
  ]);

  return PaginatedResponse.build(
    movements.map((m) => m.toJSON()),
    totalItems,
    page,
    pageSize,
    "Battery movements retrieved successfully",
  );
};

// GET /api/batteries/:id/details: everything the console knows about
// one pack on one page - its trips (receipts naming it), attendance
// history, closing sheet appearances and swaps. Typed names elsewhere
// are matched forgivingly: "SUB 16" and "sub16" are the same pack.
export const getBatteryDetailsService = async (id: string, role: string) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // "SUB16" becomes /^S[^a-z0-9]*U[^a-z0-9]*B[^a-z0-9]*1[^a-z0-9]*6$/i
  const namePattern = new RegExp(
    `^${canon(battery.code).split("").join("[^A-Za-z0-9]*")}$`,
    "i",
  );

  const today = dayString();
  const monthPattern = new RegExp(`^${today.slice(0, 7)}-`);
  const receiptBase = { batteryName: namePattern, status: { $ne: "void" } };
  const sumStage = {
    $group: {
      _id: null,
      trips: { $sum: { $ifNull: ["$expectedTrips", 0] } },
      receipts: { $sum: 1 },
    },
  };

  // attendance is role-scoped like the attendance page: non-admins see
  // only their own register's marks
  const attendanceFilter: Record<string, any> = { battery: battery._id };
  if (role !== "admin") {
    const own =
      role === "manager"
        ? "manager"
        : role === "storekeeper"
          ? "storekeeper"
          : "staff";
    Object.assign(
      attendanceFilter,
      own === "staff"
        ? { register: { $in: ["staff", null] } }
        : { register: own },
    );
  }

  const closingSince = new Date(`${today}T12:00:00Z`);
  closingSince.setDate(closingSince.getDate() - 30);
  const closingSinceDay = closingSince.toISOString().slice(0, 10);

  const [
    allAgg,
    todayAgg,
    monthAgg,
    recentReceipts,
    attendance,
    closings,
    swaps,
  ] = await Promise.all([
    Receipt.aggregate([{ $match: receiptBase }, sumStage]),
    Receipt.aggregate([{ $match: { ...receiptBase, date: today } }, sumStage]),
    Receipt.aggregate([
      { $match: { ...receiptBase, date: monthPattern } },
      sumStage,
    ]),
    Receipt.find(receiptBase)
      .sort({ date: -1, createdAt: -1 })
      .limit(15)
      .select("billId date busNumber expectedTrips createdAt"),
    BatteryAttendanceEntry.find(attendanceFilter)
      .sort({ date: -1, createdAt: -1 })
      .limit(30),
    BatteryClosingEntry.find({ date: { $gte: closingSinceDay } }).sort({
      date: -1,
      createdAt: -1,
    }),
    BatterySwap.find({
      $or: [{ initialBattery: battery._id }, { suppliedBattery: battery._id }],
    })
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const round = (n: number) => Math.round(n * 2) / 2;
  const pick = (agg: any[]) => {
    const row = agg[0] || { trips: 0, receipts: 0 };
    return { trips: round(row.trips), receipts: row.receipts };
  };

  const matchedClosings = closings
    .filter((e) => canon(e.batteryName) === canon(battery.code))
    .slice(0, 15);

  // where humans last wrote the pack down: checklist first, receipts next
  const sightings = await lastSightingsMap();

  return new ApiResponse(200, "Battery details retrieved successfully", {
    battery: battery.toJSON(),
    lastSeen: sightings.get(canonBattery(battery.code)) ?? null,
    trips: {
      today: pick(todayAgg),
      thisMonth: pick(monthAgg),
      allTime: pick(allAgg),
    },
    receipts: recentReceipts.map((r) => r.toJSON()),
    attendance: attendance.map((a) => a.toJSON()),
    closings: matchedClosings.map((e) => e.toJSON()),
    swaps: swaps.map((s) => ({
      ...s.toJSON(),
      role:
        String(s.suppliedBattery) === String(battery._id)
          ? "went_on"
          : "came_off",
    })),
  });
};

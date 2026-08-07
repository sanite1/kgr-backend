import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryAttendanceEntry from "../models/BatteryAttendanceEntry";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import {
  IMarkAttendance,
  IAttendanceQuery,
  IAttendanceCompareQuery,
  IAttendanceDaysQuery,
  AttendanceRegister,
} from "../interfaces/batteryAttendance.interface";

const REGISTERS: AttendanceRegister[] = ["manager", "staff", "storekeeper"];

// which of the three registers a role belongs to; admin owns none and
// may write any
const roleRegister = (role: string): AttendanceRegister | null => {
  if (role === "admin") return null;
  if (role === "manager") return "manager";
  if (role === "storekeeper") return "storekeeper";
  return "staff";
};

// entries from before the split carry no register; they belong to staff
const registerFilter = (register: AttendanceRegister) =>
  register === "staff" ? { register: { $in: ["staff", null] } } : { register };

const assertRegisterAllowed = (
  register: AttendanceRegister,
  role: string,
): void => {
  if (role === "admin") return;
  if (roleRegister(role) !== register) {
    throw new ApiError(
      403,
      `Your account belongs to the ${roleRegister(role)} attendance, not the ${register} one`,
    );
  }
};

// GET /api/battery-attendance?session=&register=&date=: one register's
// view of the whole fleet. Unmarked packs stay visible - absence must
// be seen, that is the point of taking attendance.
export const getAttendanceService = async (
  query: IAttendanceQuery,
  role: string,
) => {
  assertRegisterAllowed(query.register, role);
  const date = query.date || dayString();

  // the closing sheets say where each pack was last put to bed; that
  // sighting is offered to the caller as a suggestion. Typed names are
  // matched forgivingly: "SUB 16" and "sub16" are the same pack.
  const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const since = new Date(`${date}T12:00:00Z`);
  since.setDate(since.getDate() - 3);
  const sinceDay = since.toISOString().slice(0, 10);

  const [batteries, marks, closings] = await Promise.all([
    Battery.find().sort({ code: 1 }),
    BatteryAttendanceEntry.find({
      date,
      session: query.session,
      ...registerFilter(query.register),
    }),
    BatteryClosingEntry.find({ date: { $gte: sinceDay, $lte: date } }).sort({
      date: 1,
      createdAt: 1,
    }),
  ]);

  // ascending sort means the last write per pack wins
  const closingByCanon = new Map<
    string,
    { location: string; date: string; sheet: string }
  >();
  for (const e of closings) {
    closingByCanon.set(canon(e.batteryName), {
      location: e.location,
      date: e.date,
      sheet: e.sheet ?? "main",
    });
  }

  const markByBattery = new Map(marks.map((m) => [String(m.battery), m]));

  const rows = batteries.map((battery) => {
    const mark = markByBattery.get(String(battery._id));
    return {
      batteryId: String(battery._id),
      batteryCode: battery.code,
      batteryStatus: battery.status,
      busNumber: battery.busNumber || "",
      closing: closingByCanon.get(canon(battery.code)) ?? null,
      mark: mark ? mark.toJSON() : null,
    };
  });

  const seen = marks.filter((m) => m.status === "seen").length;
  const missing = marks.filter((m) => m.status === "missing").length;

  return new ApiResponse(200, "Attendance retrieved successfully", {
    date,
    session: query.session,
    register: query.register,
    rows,
    totals: {
      fleet: batteries.length,
      seen,
      missing,
      unmarked: batteries.length - seen - missing,
    },
  });
};

// POST /api/battery-attendance: one verdict for one pack on one
// register. Re-marking the same pack overwrites, so slips are fixable.
export const markAttendanceService = async (
  payload: IMarkAttendance,
  requester: { id: string; role: string },
) => {
  assertRegisterAllowed(payload.register, requester.role);

  const battery = await Battery.findById(payload.batteryId);
  if (!battery) throw new ApiError(404, "Battery not found");

  if (payload.status === "seen" && !payload.location) {
    throw new ApiError(400, "Say where the battery was seen");
  }

  const user = await User.findById(requester.id);
  const date = dayString();

  const entry = await BatteryAttendanceEntry.findOneAndUpdate(
    {
      date,
      session: payload.session,
      register: payload.register,
      battery: battery._id,
    },
    {
      $set: {
        batteryCode: battery.code,
        status: payload.status,
        location: payload.status === "seen" ? payload.location : undefined,
        lastSeen:
          payload.status === "missing" ? payload.lastSeen?.trim() || "" : "",
        markedBy: requester.id,
        markedByName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return new ApiResponse(
    200,
    payload.status === "seen"
      ? `${battery.code} marked seen`
      : `${battery.code} marked MISSING`,
    entry.toJSON(),
  );
};

// GET /api/battery-attendance/compare?session=&date=: the three
// registers laid side by side per battery (admin only, enforced at the
// route). Matching is exact - the rows are keyed to registered packs.
export const getAttendanceCompareService = async (
  query: IAttendanceCompareQuery,
) => {
  const date = query.date || dayString();

  const [batteries, marks] = await Promise.all([
    Battery.find().sort({ code: 1 }),
    BatteryAttendanceEntry.find({ date, session: query.session }),
  ]);

  // battery id -> register -> mark
  const byBattery = new Map<string, Map<string, any>>();
  for (const m of marks) {
    const key = String(m.battery);
    if (!byBattery.has(key)) byBattery.set(key, new Map());
    byBattery.get(key)!.set(m.register ?? "staff", m);
  }

  const rows = batteries.map((battery) => {
    const perRegister = byBattery.get(String(battery._id));
    const verdicts: Record<string, any> = {};
    for (const r of REGISTERS) {
      const m = perRegister?.get(r);
      verdicts[r] = m
        ? {
            status: m.status,
            location: m.location,
            lastSeen: m.lastSeen,
            markedByName: m.markedByName,
          }
        : null;
    }

    const marked = REGISTERS.map((r) => verdicts[r]).filter(Boolean);
    let status: "match" | "mismatch" | "partial" | "unmarked";
    if (marked.length === 0) {
      status = "unmarked";
    } else {
      const agree = marked.every(
        (v) =>
          v.status === marked[0].status &&
          (v.status !== "seen" || v.location === marked[0].location),
      );
      if (!agree) status = "mismatch";
      else status = marked.length === REGISTERS.length ? "match" : "partial";
    }

    return {
      batteryId: String(battery._id),
      batteryCode: battery.code,
      busNumber: battery.busNumber || "",
      manager: verdicts.manager,
      staff: verdicts.staff,
      storekeeper: verdicts.storekeeper,
      status,
    };
  });

  // trouble reads first: red, then incomplete, then uncalled, then green
  const rank = { mismatch: 0, partial: 1, unmarked: 2, match: 3 } as const;
  rows.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.batteryCode.localeCompare(b.batteryCode, undefined, { numeric: true }),
  );

  return new ApiResponse(200, "Attendance comparison retrieved successfully", {
    date,
    session: query.session,
    rows,
    totals: {
      fleet: batteries.length,
      matched: rows.filter((r) => r.status === "match").length,
      mismatched: rows.filter((r) => r.status === "mismatch").length,
      partial: rows.filter((r) => r.status === "partial").length,
      unmarked: rows.filter((r) => r.status === "unmarked").length,
    },
  });
};

// GET /api/battery-attendance/days: past roll calls, newest first.
// Admin sees every register; a manager sees only their own.
export const getAttendanceDaysService = async (
  query: IAttendanceDaysQuery,
  role: string,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const own = roleRegister(role);
  const match = own ? registerFilter(own) : {};

  const groupStage = {
    $group: {
      _id: {
        date: "$date",
        session: "$session",
        register: { $ifNull: ["$register", "staff"] },
      },
      seen: { $sum: { $cond: [{ $eq: ["$status", "seen"] }, 1, 0] } },
      missing: { $sum: { $cond: [{ $eq: ["$status", "missing"] }, 1, 0] } },
    },
  };

  const [days, countRows] = await Promise.all([
    BatteryAttendanceEntry.aggregate([
      { $match: match },
      groupStage,
      { $sort: { "_id.date": -1, "_id.session": 1, "_id.register": 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
    BatteryAttendanceEntry.aggregate([
      { $match: match },
      groupStage,
      { $count: "n" },
    ]),
  ]);

  return PaginatedResponse.build(
    days.map((d: any) => ({
      date: d._id.date,
      session: d._id.session,
      register: d._id.register,
      seen: d.seen,
      missing: d.missing,
      marked: d.seen + d.missing,
    })),
    countRows[0]?.n ?? 0,
    page,
    pageSize,
    "Attendance days retrieved successfully",
  );
};

// DELETE /api/battery-attendance/:id: clear a same-day slip back to
// unmarked. The person who marked it (or an admin) may clear it.
export const clearAttendanceService = async (
  id: string,
  requester: { id: string; role: string },
) => {
  const entry = await BatteryAttendanceEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const isOwner = String(entry.markedBy) === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw new ApiError(403, "Only the person who marked it can clear it");
  }
  if (entry.date !== dayString() && requester.role !== "admin") {
    throw new ApiError(400, "Past days can only be corrected by an admin");
  }

  await entry.deleteOne();
  return new ApiResponse(
    200,
    `${entry.batteryCode} cleared back to unmarked`,
    undefined,
  );
};

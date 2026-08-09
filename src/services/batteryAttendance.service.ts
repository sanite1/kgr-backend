import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryAttendanceLog from "../models/BatteryAttendanceLog";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { nextSequence } from "../helpers/sequence";
import { sightingsOnDay, canonBattery } from "../helpers/batterySighting";
import {
  ICreateAttendanceLog,
  IAttendanceLogsQuery,
  IAttendanceCompareQuery,
  IAttendanceLogRow,
} from "../interfaces/batteryAttendance.interface";

const LOG_ID_START = Number(process.env.ATTENDANCE_LOG_ID_START) || 1;

// GET /api/battery-attendance/fleet: the blank sheet for a new log.
// Every registered pack, with today's checklist/receipt sighting and
// the closing sheets' last word on where it sleeps, both as hints.
export const getAttendanceFleetService = async () => {
  const today = dayString();
  const canon = canonBattery;
  const since = new Date(`${today}T12:00:00Z`);
  since.setDate(since.getDate() - 3);
  const sinceDay = since.toISOString().slice(0, 10);

  const [batteries, closings, sightings] = await Promise.all([
    Battery.find({ isActive: true }).sort({ code: 1 }),
    BatteryClosingEntry.find({ date: { $gte: sinceDay, $lte: today } }).sort({
      date: 1,
      createdAt: 1,
    }),
    sightingsOnDay(today),
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

  const rows = batteries.map((battery) => ({
    batteryId: String(battery._id),
    batteryCode: battery.code,
    batteryStatus: battery.status,
    lastSeen: sightings.get(canon(battery.code)) ?? null,
    closing: closingByCanon.get(canon(battery.code)) ?? null,
  }));

  return new ApiResponse(200, "Fleet retrieved successfully", {
    date: today,
    rows,
  });
};

// POST /api/battery-attendance/logs: one user's completed walk of the
// fleet, saved whole as an immutable numbered record.
export const createAttendanceLogService = async (
  payload: ICreateAttendanceLog,
  requester: { id: string; role: string },
) => {
  const batteries = await Battery.find({ isActive: true });
  const byId = new Map(batteries.map((b) => [String(b._id), b]));

  // last mark per pack wins so a corrected draft row cannot duplicate
  const rowByBattery = new Map<string, IAttendanceLogRow>();
  for (const row of payload.rows) {
    const battery = byId.get(row.batteryId);
    if (!battery) {
      throw new ApiError(400, "A marked battery is not in the fleet");
    }
    if (row.status === "seen" && !row.location) {
      throw new ApiError(400, `Say where ${battery.code} was seen`);
    }
    rowByBattery.set(String(battery._id), {
      battery: battery._id as any,
      batteryCode: battery.code,
      status: row.status,
      timeOfDay: row.timeOfDay,
      location: row.status === "seen" ? row.location : undefined,
      lastSeen: row.status === "missing" ? row.lastSeen?.trim() || "" : "",
    });
  }

  const rows = [...rowByBattery.values()];
  if (rows.length === 0) {
    throw new ApiError(400, "Mark at least one battery before submitting");
  }

  const seen = rows.filter((r) => r.status === "seen").length;
  const missing = rows.length - seen;

  const user = await User.findById(requester.id);
  const logId = await nextSequence("battery_attendance_log_id", LOG_ID_START);

  const log = await BatteryAttendanceLog.create({
    logId,
    date: dayString(),
    rows,
    totals: {
      fleet: batteries.length,
      seen,
      missing,
      unmarked: batteries.length - rows.length,
    },
    submittedBy: requester.id,
    submittedByName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    submittedByRole: requester.role,
  });

  return new ApiResponse(
    201,
    `Attendance #${logId} submitted: ${seen} seen, ${missing} missing`,
    log.toJSON(),
  );
};

// GET /api/battery-attendance/logs: every submitted log, newest first,
// with who logged it always on show.
export const getAttendanceLogsService = async (query: IAttendanceLogsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [logs, totalItems] = await Promise.all([
    BatteryAttendanceLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("-rows"),
    BatteryAttendanceLog.countDocuments(),
  ]);

  return PaginatedResponse.build(
    logs.map((l) => l.toJSON()),
    totalItems,
    page,
    pageSize,
    "Attendance logs retrieved successfully",
  );
};

// GET /api/battery-attendance/logs/:id: one log's full rows, read only.
// Packs the submitter never marked ride along too, so the page can show
// the whole fleet and not just the called part of it.
export const getAttendanceLogService = async (id: string) => {
  const log = await BatteryAttendanceLog.findById(id);
  if (!log) throw new ApiError(404, "Attendance log not found");

  const batteries = await Battery.find({ isActive: true }).sort({ code: 1 });
  const markedIds = new Set(log.rows.map((r) => String(r.battery)));
  const unmarked = batteries
    .filter((b) => !markedIds.has(String(b._id)))
    .map((b) => ({ battery: String(b._id), batteryCode: b.code }));

  return new ApiResponse(200, "Attendance log retrieved successfully", {
    ...log.toJSON(),
    unmarked,
  });
};

// GET /api/battery-attendance/compare?date=: every log for a date laid
// side by side per battery (admin only, enforced at the route)
export const getAttendanceCompareService = async (
  query: IAttendanceCompareQuery,
) => {
  const date = query.date || dayString();

  const [batteries, logs, sightings] = await Promise.all([
    Battery.find({ isActive: true }).sort({ code: 1 }),
    BatteryAttendanceLog.find({ date }).sort({ createdAt: 1 }),
    sightingsOnDay(date),
  ]);

  // per log: battery id -> that log's row
  const perLog = logs.map(
    (log) => new Map(log.rows.map((r) => [String(r.battery), r])),
  );

  const rows = batteries.map((battery) => {
    const key = String(battery._id);
    const verdicts = perLog.map((m) => {
      const r = m.get(key);
      return r
        ? {
            status: r.status,
            timeOfDay: r.timeOfDay,
            location: r.location,
            lastSeen: r.lastSeen,
          }
        : null;
    });

    const marked = verdicts.filter(Boolean) as NonNullable<
      (typeof verdicts)[number]
    >[];
    let status: "match" | "mismatch" | "partial" | "unmarked";
    if (logs.length === 0 || marked.length === 0) {
      status = "unmarked";
    } else {
      const agree = marked.every(
        (v) =>
          v.status === marked[0].status &&
          (v.status !== "seen" || v.location === marked[0].location),
      );
      if (!agree) status = "mismatch";
      else status = marked.length === logs.length ? "match" : "partial";
    }

    return {
      batteryId: key,
      batteryCode: battery.code,
      lastSeen: sightings.get(canonBattery(battery.code)) ?? null,
      verdicts,
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
    logs: logs.map((l) => ({
      _id: String(l._id),
      logId: l.logId,
      submittedByName: l.submittedByName,
      submittedAt: l.createdAt,
    })),
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

// DELETE /api/battery-attendance/logs/:id: a wrong log is removed by an
// admin and re-entered; submitted logs are never edited in place.
export const deleteAttendanceLogService = async (id: string) => {
  const log = await BatteryAttendanceLog.findById(id);
  if (!log) throw new ApiError(404, "Attendance log not found");
  await log.deleteOne();
  return new ApiResponse(200, `Attendance #${log.logId} deleted`, undefined);
};

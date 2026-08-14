import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryAttendanceLog from "../models/BatteryAttendanceLog";
import BatteryMovement from "../models/BatteryMovement";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { nextSequence } from "../helpers/sequence";
import {
  sightingsOnDay,
  lastSightingsMap,
  canonBattery,
} from "../helpers/batterySighting";
import {
  ICreateAttendanceLog,
  IAttendanceLogsQuery,
  IAttendanceCompareQuery,
  IAttendanceLogRow,
} from "../interfaces/batteryAttendance.interface";

const LOG_ID_START = Number(process.env.ATTENDANCE_LOG_ID_START) || 1;

// the part of the day it is right now, Lagos time; stamped onto rows
// the system fills in itself
const timeOfDayNow = (): "morning" | "afternoon" | "night" => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "night";
};

// One-time backfill: logs submitted before auto-marking existed get
// their auto rows filled in from their own day's sightings, so old logs
// read the same as new ones. Processed logs carry totals.auto and are
// never touched again. Fire-and-forget, safe to re-run.
const backfillAutoMarks = async () => {
  const logs = await BatteryAttendanceLog.find({
    "totals.auto": { $exists: false },
  });
  if (logs.length === 0) return;

  const batteries = await Battery.find({ isActive: true });
  for (const log of logs) {
    const sightings = await sightingsOnDay(log.date);
    const marked = new Set(log.rows.map((r) => String(r.battery)));
    const autoTime = log.rows[0]?.timeOfDay ?? "morning";
    let auto = 0;
    for (const battery of batteries) {
      if (marked.has(String(battery._id))) continue;
      const sighting = sightings.get(canonBattery(battery.code));
      if (!sighting) continue;
      log.rows.push({
        battery: battery._id as any,
        batteryCode: battery.code,
        status: "seen",
        timeOfDay: autoTime,
        onBus: sighting.busName,
        auto: true,
        lastSeen: "",
      });
      auto += 1;
    }
    const seen = log.rows.filter((r) => r.status === "seen").length;
    log.totals = {
      fleet: log.totals.fleet,
      seen,
      missing: log.rows.length - seen,
      unmarked: Math.max(0, log.totals.fleet - log.rows.length),
      auto,
    };
    await log.save();
  }
};
backfillAutoMarks().catch(() => {});

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

  if (rowByBattery.size === 0) {
    throw new ApiError(400, "Mark at least one battery before submitting");
  }

  // Packs the submitter skipped are accounted for by the system so the
  // admin still knows where they are. A manual mark always wins. The
  // evidence chain, freshest claim first:
  //   1. today's checklist/receipt sighting -> "on that bus"
  //   2. faulty / not-in-use status vs the last 7-day sighting: whichever
  //      is more recent speaks (a status changed after the sighting wins)
  //   3. the last sighting this week, stamped with its date
  //   4. the last hand-marked "seen" in a previous roll call (14 days)
  //   5. nothing anywhere -> honestly unmarked
  const today = dayString();
  const prevSince = new Date(`${today}T12:00:00Z`);
  prevSince.setDate(prevSince.getDate() - 14);
  const [todaySightings, weekSightings, prevLogs] = await Promise.all([
    sightingsOnDay(today),
    lastSightingsMap(),
    BatteryAttendanceLog.find({
      date: { $gte: prevSince.toISOString().slice(0, 10), $lt: today },
    }).sort({ createdAt: -1 }),
  ]);

  // per pack: the newest hand-marked "seen" from earlier roll calls
  const prevMarkByBattery = new Map<
    string,
    { location?: string; onBus?: string; date: string }
  >();
  for (const prev of prevLogs) {
    for (const r of prev.rows) {
      const key = String(r.battery);
      if (r.auto || r.status !== "seen" || prevMarkByBattery.has(key)) continue;
      prevMarkByBattery.set(key, {
        location: r.location,
        onBus: r.onBus || undefined,
        date: prev.date,
      });
    }
  }

  // when did each skipped faulty/not-in-use pack last change status?
  const parked = batteries.filter(
    (b) =>
      !rowByBattery.has(String(b._id)) &&
      (b.status === "faulty" || b.status === "not_in_use"),
  );
  const statusDates = new Map<string, string>();
  await Promise.all(
    parked.map(async (b) => {
      const move = await BatteryMovement.findOne({
        battery: b._id,
        action: "status",
        toStatus: b.status,
      }).sort({ createdAt: -1 });
      if (move?.createdAt) {
        statusDates.set(
          String(b._id),
          move.createdAt.toISOString().slice(0, 10),
        );
      }
    }),
  );

  const autoTime = timeOfDayNow();
  let auto = 0;
  const addAuto = (
    battery: (typeof batteries)[number],
    fields: Partial<IAttendanceLogRow>,
  ) => {
    rowByBattery.set(String(battery._id), {
      battery: battery._id as any,
      batteryCode: battery.code,
      status: "seen",
      timeOfDay: autoTime,
      auto: true,
      lastSeen: "",
      ...fields,
    });
    auto += 1;
  };

  for (const battery of batteries) {
    const key = String(battery._id);
    if (rowByBattery.has(key)) continue;
    const canonKey = canonBattery(battery.code);
    const sighting =
      todaySightings.get(canonKey) ?? weekSightings.get(canonKey);
    const isParked =
      battery.status === "faulty" || battery.status === "not_in_use";

    if (isParked) {
      const statusDate = statusDates.get(key) ?? "";
      // the checklist speaks unless the status change is at least as new
      if (sighting && sighting.date > statusDate) {
        addAuto(battery, {
          onBus: sighting.busName,
          autoSource:
            sighting.date === today ? "today_sighting" : "last_sighting",
          asOf: sighting.date,
        });
      } else {
        addAuto(battery, {
          autoSource: "battery_status",
          note: battery.status,
          asOf: statusDate || today,
        });
      }
      continue;
    }

    if (sighting) {
      addAuto(battery, {
        onBus: sighting.busName,
        autoSource:
          sighting.date === today ? "today_sighting" : "last_sighting",
        asOf: sighting.date,
      });
      continue;
    }

    const prev = prevMarkByBattery.get(key);
    if (prev) {
      addAuto(battery, {
        location: prev.location as IAttendanceLogRow["location"],
        onBus: prev.onBus,
        autoSource: "prev_attendance",
        asOf: prev.date,
      });
    }
  }

  const rows = [...rowByBattery.values()];
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
      auto,
    },
    submittedBy: requester.id,
    submittedByName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    submittedByRole: requester.role,
  });

  return new ApiResponse(
    201,
    `Attendance #${logId} submitted: ${seen} seen${auto > 0 ? ` (${auto} auto)` : ""}, ${missing} missing`,
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
            onBus: r.onBus || undefined,
            auto: r.auto || undefined,
            autoSource: r.autoSource,
            asOf: r.asOf,
            note: r.note || undefined,
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
      // "where" is a yard location or a bus, whichever the row carries
      const place = (v: { location?: string; onBus?: string; note?: string }) =>
        v.location ?? (v.onBus ? `bus:${v.onBus}` : (v.note ?? ""));
      const agree = marked.every(
        (v) =>
          v.status === marked[0].status &&
          (v.status !== "seen" || place(v) === place(marked[0])),
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

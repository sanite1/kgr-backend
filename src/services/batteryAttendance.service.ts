import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryAttendanceEntry from "../models/BatteryAttendanceEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import {
  IMarkAttendance,
  IAttendanceQuery,
  IAttendanceDaysQuery,
} from "../interfaces/batteryAttendance.interface";

// GET /api/battery-attendance?session=&date=: the whole registered
// fleet with each pack's verdict for that session. Packs nobody marked
// come back as "unmarked" - absence must be visible, that is the point
// of taking attendance.
export const getAttendanceService = async (query: IAttendanceQuery) => {
  const date = query.date || dayString();

  const [batteries, marks] = await Promise.all([
    Battery.find().sort({ code: 1 }),
    BatteryAttendanceEntry.find({ date, session: query.session }),
  ]);

  const markByBattery = new Map(marks.map((m) => [String(m.battery), m]));

  const rows = batteries.map((battery) => {
    const mark = markByBattery.get(String(battery._id));
    return {
      batteryId: String(battery._id),
      batteryCode: battery.code,
      batteryStatus: battery.status,
      busNumber: battery.busNumber || "",
      mark: mark ? mark.toJSON() : null,
    };
  });

  const seen = marks.filter((m) => m.status === "seen").length;
  const missing = marks.filter((m) => m.status === "missing").length;

  return new ApiResponse(200, "Attendance retrieved successfully", {
    date,
    session: query.session,
    rows,
    totals: {
      fleet: batteries.length,
      seen,
      missing,
      unmarked: batteries.length - seen - missing,
    },
  });
};

// POST /api/battery-attendance: one verdict for one pack. Re-marking
// the same pack in the same session overwrites, so slips are fixable.
export const markAttendanceService = async (
  payload: IMarkAttendance,
  requester: { id: string },
) => {
  const battery = await Battery.findById(payload.batteryId);
  if (!battery) throw new ApiError(404, "Battery not found");

  if (payload.status === "seen" && !payload.location) {
    throw new ApiError(400, "Say where the battery was seen");
  }

  const user = await User.findById(requester.id);
  const date = dayString();

  const entry = await BatteryAttendanceEntry.findOneAndUpdate(
    { date, session: payload.session, battery: battery._id },
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

// GET /api/battery-attendance/days: past roll calls, newest first
// (managers). One row per date and session.
export const getAttendanceDaysService = async (query: IAttendanceDaysQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const groupStage = {
    $group: {
      _id: { date: "$date", session: "$session" },
      seen: { $sum: { $cond: [{ $eq: ["$status", "seen"] }, 1, 0] } },
      missing: { $sum: { $cond: [{ $eq: ["$status", "missing"] }, 1, 0] } },
    },
  };

  const [days, countRows] = await Promise.all([
    BatteryAttendanceEntry.aggregate([
      groupStage,
      { $sort: { "_id.date": -1, "_id.session": 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
    BatteryAttendanceEntry.aggregate([groupStage, { $count: "n" }]),
  ]);

  return PaginatedResponse.build(
    days.map((d: any) => ({
      date: d._id.date,
      session: d._id.session,
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

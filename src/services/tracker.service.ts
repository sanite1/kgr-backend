import mongoose from "mongoose";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Tracker from "../models/Tracker";
import TrackerUpdateEntry from "../models/TrackerUpdateEntry";
import Bus from "../models/Bus";
import User from "../models/User";
import logger from "../config/logger";
import { nextSequence } from "../helpers/sequence";
import { canonBattery as canon } from "../helpers/batterySighting";
import {
  ICreateTracker,
  IUpdateTracker,
  ITrackersQuery,
  ITrackerUpdatesQuery,
} from "../interfaces/tracker.interface";

// One-time migration: "trackers" joined the everyone-list after some
// users already had customized access arrays saved, and effectiveAccess
// returns those verbatim. Add the new key to every stored override once;
// the counter gate means a later deliberate removal is respected.
const grantTrackersOnce = async () => {
  const run = await nextSequence("migration_access_trackers", 1);
  if (run !== 1) return;
  const res = await User.updateMany(
    { access: { $type: "array" } },
    { $addToSet: { access: "trackers" } },
  );
  logger.info(
    `Tracker access granted to ${res.modifiedCount} customized user(s)`,
  );
};
const runGrant = () =>
  grantTrackersOnce().catch((error: Error) =>
    logger.error("Tracker access migration failed", { message: error.message }),
  );
if (mongoose.connection.readyState === 1) {
  void runGrant();
} else {
  mongoose.connection.once("connected", () => void runGrant());
}

// GET /api/trackers
export const getTrackersService = async (query: ITrackersQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.busName = pattern;
  }

  const [trackers, totalItems] = await Promise.all([
    Tracker.find(filter)
      .sort({ busName: 1 })
      .collation({ locale: "en", numericOrdering: true })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Tracker.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    trackers.map((t) => t.toJSON()),
    totalItems,
    page,
    pageSize,
    "Trackers retrieved successfully",
  );
};

// GET /api/trackers/summary: the four tiles
export const getTrackerSummaryService = async () => {
  const rows = await Tracker.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts: Record<string, number> = { online: 0, offline: 0, parked: 0 };
  let total = 0;
  for (const row of rows) {
    counts[row._id] = row.count;
    total += row.count;
  }
  return new ApiResponse(200, "Tracker summary retrieved successfully", {
    total,
    counts,
  });
};

// POST /api/trackers: register a tracker for a bus, picked or typed.
// "A 2" and "a2" are the same bus, so duplicates are checked forgivingly.
export const createTrackerService = async (
  payload: ICreateTracker,
  createdBy: string,
) => {
  let busName = payload.busName?.trim().toUpperCase() || "";
  let busId: string | undefined;

  if (payload.busId) {
    const bus = await Bus.findById(payload.busId);
    if (!bus) throw new ApiError(404, "Bus not found");
    busName = bus.number;
    busId = String(bus._id);
  }
  if (!busName) {
    throw new ApiError(400, "Pick a bus or type its name");
  }

  const existing = await Tracker.find().select("busName");
  const clash = existing.find((t) => canon(t.busName) === canon(busName));
  if (clash) {
    throw new ApiError(
      409,
      `${clash.busName} already has a tracker on the board`,
    );
  }

  const tracker = await Tracker.create({
    busName,
    bus: busId,
    createdBy,
  });
  return new ApiResponse(
    201,
    `Tracker for ${tracker.busName} added`,
    tracker.toJSON(),
  );
};

// POST /api/trackers/:id/update: one reading off the tracking platform.
// The entry is history; the tracker document keeps the latest snapshot.
export const updateTrackerService = async (
  id: string,
  payload: IUpdateTracker,
  byId: string,
) => {
  const tracker = await Tracker.findById(id);
  if (!tracker) throw new ApiError(404, "Tracker not found");

  const user = await User.findById(byId);
  const byName = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  const entry = await TrackerUpdateEntry.create({
    tracker: tracker._id,
    busName: tracker.busName,
    status: payload.status,
    lastSeenText: payload.lastSeenText.trim(),
    location: payload.location.trim(),
    purpose: payload.purpose?.trim() || "",
    note: payload.note?.trim() || "",
    by: byId,
    byName,
  });

  tracker.status = payload.status;
  tracker.lastSeenText = entry.lastSeenText;
  tracker.location = entry.location;
  tracker.purpose = entry.purpose;
  tracker.note = entry.note;
  tracker.lastUpdateAt = entry.createdAt;
  tracker.lastUpdateByName = byName;
  await tracker.save();

  return new ApiResponse(
    200,
    `${tracker.busName} tracker updated`,
    tracker.toJSON(),
  );
};

// GET /api/trackers/:id/updates: the tracker's history, newest first
export const getTrackerUpdatesService = async (
  id: string,
  query: ITrackerUpdatesQuery,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [entries, totalItems] = await Promise.all([
    TrackerUpdateEntry.find({ tracker: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    TrackerUpdateEntry.countDocuments({ tracker: id }),
  ]);

  return PaginatedResponse.build(
    entries.map((e) => e.toJSON()),
    totalItems,
    page,
    pageSize,
    "Tracker updates retrieved successfully",
  );
};

// DELETE /api/trackers/:id (admin): the tracker and its history go
export const deleteTrackerService = async (id: string) => {
  const tracker = await Tracker.findById(id);
  if (!tracker) throw new ApiError(404, "Tracker not found");
  await TrackerUpdateEntry.deleteMany({ tracker: tracker._id });
  await tracker.deleteOne();
  return new ApiResponse(
    200,
    `Tracker for ${tracker.busName} deleted`,
    undefined,
  );
};

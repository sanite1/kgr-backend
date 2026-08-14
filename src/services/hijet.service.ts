import mongoose from "mongoose";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import HijetEntry from "../models/HijetEntry";
import User from "../models/User";
import logger from "../config/logger";
import { dayString } from "../helpers/day";
import { nextSequence } from "../helpers/sequence";
import {
  ICreateHijetEntry,
  IHijetEntriesQuery,
} from "../interfaces/hijet.interface";

// One-time migration: "hijet" joined the everyone-list after some users
// already had customized access arrays saved. Same treatment as the
// trackers module: add the key to stored overrides exactly once.
const grantHijetOnce = async () => {
  const run = await nextSequence("migration_access_hijet", 1);
  if (run !== 1) return;
  const res = await User.updateMany(
    { access: { $type: "array" } },
    { $addToSet: { access: "hijet" } },
  );
  logger.info(
    `Hijet access granted to ${res.modifiedCount} customized user(s)`,
  );
};
const runGrant = () =>
  grantHijetOnce().catch((error: Error) =>
    logger.error("Hijet access migration failed", { message: error.message }),
  );
if (mongoose.connection.readyState === 1) {
  void runGrant();
} else {
  mongoose.connection.once("connected", () => void runGrant());
}

// POST /api/hijet
export const createHijetEntryService = async (
  payload: ICreateHijetEntry,
  byId: string,
) => {
  const vehicleName = payload.vehicleName.trim().toUpperCase();
  const batteryName = payload.batteryName.trim().toUpperCase();
  if (!vehicleName) throw new ApiError(400, "Say which hijet took it");
  if (!batteryName) throw new ApiError(400, "Say which battery it took");

  const user = await User.findById(byId);
  const entry = await HijetEntry.create({
    date: dayString(),
    vehicleName,
    batteryName,
    timeOfDay: payload.timeOfDay,
    fromLocation: payload.fromLocation,
    trips: payload.trips,
    note: payload.note?.trim() || "",
    by: byId,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });

  return new ApiResponse(
    201,
    `${batteryName} logged onto ${vehicleName}`,
    entry.toJSON(),
  );
};

// GET /api/hijet: entries newest first
export const getHijetEntriesService = async (query: IHijetEntriesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ batteryName: pattern }, { vehicleName: pattern }];
  }

  const [entries, totalItems] = await Promise.all([
    HijetEntry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    HijetEntry.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    entries.map((e) => e.toJSON()),
    totalItems,
    page,
    pageSize,
    "Hijet entries retrieved successfully",
  );
};

// GET /api/hijet/summary: today's activity at a glance
export const getHijetSummaryService = async () => {
  const today = dayString();
  const entries = await HijetEntry.find({ date: today });
  const batteries = new Set(entries.map((e) => e.batteryName)).size;
  const vehicles = new Set(entries.map((e) => e.vehicleName)).size;
  const trips = entries.reduce((sum, e) => sum + (e.trips ?? 0), 0);

  return new ApiResponse(200, "Hijet summary retrieved successfully", {
    today: {
      entries: entries.length,
      batteries,
      vehicles,
      trips: Math.round(trips * 2) / 2,
    },
  });
};

// DELETE /api/hijet/:id (admin): wrong entries are removed, not edited
export const deleteHijetEntryService = async (id: string) => {
  const entry = await HijetEntry.findById(id);
  if (!entry) throw new ApiError(404, "Hijet entry not found");
  await entry.deleteOne();
  return new ApiResponse(200, `${entry.batteryName} entry removed`, undefined);
};

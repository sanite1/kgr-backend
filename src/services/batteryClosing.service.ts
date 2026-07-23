import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import Receipt from "../models/Receipt";
import BatterySwap from "../models/BatterySwap";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { BATTERY_LOCATIONS } from "../config/batteryLocations";
import {
  ICreateClosingEntry,
  IClosingEntriesQuery,
  IClosingDaysQuery,
} from "../interfaces/batteryClosing.interface";

// What the system already knows about a pack's day: receipts that named
// it carry expectedTrips, and swaps credit tripsAdded to the pack that
// was supplied. Used when the staff leave the trips field empty.
const deriveTrips = async (
  date: string,
  batteryName: string,
): Promise<number> => {
  const [receiptAgg, swapAgg] = await Promise.all([
    Receipt.aggregate([
      { $match: { date, batteryName, status: { $ne: "void" } } },
      { $group: { _id: null, trips: { $sum: "$expectedTrips" } } },
    ]),
    BatterySwap.aggregate([
      { $match: { date, suppliedBatteryCode: batteryName } },
      { $group: { _id: null, trips: { $sum: "$tripsAdded" } } },
    ]),
  ]);
  const total = (receiptAgg[0]?.trips ?? 0) + (swapAgg[0]?.trips ?? 0);
  return Math.round(total * 2) / 2;
};

// POST /api/battery-closing: add one battery to today's closing sheet
export const createClosingEntryService = async (
  payload: ICreateClosingEntry,
  addedById: string,
) => {
  const date = dayString();
  const batteryName = payload.batteryName.trim().toUpperCase();

  // the same pack twice on one evening's sheet is a slip
  const dupe = await BatteryClosingEntry.findOne({ date, batteryName });
  if (dupe) {
    throw new ApiError(
      409,
      `${batteryName} is already on today's closing report`,
    );
  }

  // no trips typed = let the day's receipts and swaps answer for the pack
  const tripsAuto = payload.trips === undefined;
  const trips = tripsAuto
    ? await deriveTrips(date, batteryName)
    : payload.trips!;

  const user = await User.findById(addedById);
  const entry = await BatteryClosingEntry.create({
    date,
    batteryName,
    percent: payload.percent,
    voltage: payload.voltage,
    location: payload.location,
    trips,
    tripsAuto,
    addedBy: addedById,
    addedByName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });

  return new ApiResponse(
    201,
    `${batteryName} added to the closing report`,
    entry.toJSON(),
  );
};

// GET /api/battery-closing?date=: the day's sheet plus its footer totals
export const getClosingEntriesService = async (query: IClosingEntriesQuery) => {
  const date = query.date || dayString();
  const entries = await BatteryClosingEntry.find({ date }).sort({
    createdAt: 1,
  });

  const byLocation: Record<string, number> = {};
  for (const loc of BATTERY_LOCATIONS) byLocation[loc.value] = 0;
  let fullyCharged = 0;
  let totalTrips = 0;
  for (const e of entries) {
    byLocation[e.location] = (byLocation[e.location] || 0) + 1;
    if (e.percent === 100) fullyCharged += 1;
    totalTrips += e.trips || 0;
  }

  return new ApiResponse(200, "Closing report retrieved successfully", {
    date,
    entries: entries.map((e) => e.toJSON()),
    totals: {
      count: entries.length,
      fullyCharged,
      totalTrips: Math.round(totalTrips * 2) / 2,
      byLocation,
    },
  });
};

// GET /api/battery-closing/days: past sheets, newest first (managers)
export const getClosingDaysService = async (query: IClosingDaysQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [days, totalRows] = await Promise.all([
    BatteryClosingEntry.aggregate([
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
          fullyCharged: {
            $sum: { $cond: [{ $eq: ["$percent", 100] }, 1, 0] },
          },
          totalTrips: { $sum: { $ifNull: ["$trips", 0] } },
        },
      },
      { $sort: { _id: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
    BatteryClosingEntry.distinct("date"),
  ]);

  return PaginatedResponse.build(
    days.map((d: any) => ({
      date: d._id,
      count: d.count,
      fullyCharged: d.fullyCharged,
      totalTrips: Math.round((d.totalTrips ?? 0) * 2) / 2,
    })),
    totalRows.length,
    page,
    pageSize,
    "Closing report days retrieved successfully",
  );
};

// DELETE /api/battery-closing/:id: undo a same-day slip. The person who
// added it (or an admin) may remove it while the day is still open.
export const deleteClosingEntryService = async (
  id: string,
  requester: { id: string; role: string },
) => {
  const entry = await BatteryClosingEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const isOwner = String(entry.addedBy) === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw new ApiError(403, "Only the person who added it can remove it");
  }
  if (entry.date !== dayString() && requester.role !== "admin") {
    throw new ApiError(400, "Past days can only be corrected by an admin");
  }

  await entry.deleteOne();
  return new ApiResponse(
    200,
    `${entry.batteryName} removed from the closing report`,
    undefined,
  );
};

import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import BatteryClosingEntry from "../models/BatteryClosingEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { BATTERY_LOCATIONS } from "../config/batteryLocations";
import {
  ICreateClosingEntry,
  IClosingEntriesQuery,
  IClosingDaysQuery,
  ClosingSheetKey,
} from "../interfaces/batteryClosing.interface";

// entries written before the sheets split have no sheet field; they
// belong to the main yard sheet
const sheetFilter = (sheet: ClosingSheetKey) =>
  sheet === "main" ? { sheet: { $in: ["main", null] } } : { sheet };

// battery names are typed by hand: "SUB 16" and "sub16" are the same
// pack, so matching ignores case, spaces and punctuation
const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// how many days back a receipt reaches to tick a prepared battery: the
// sheet is written the evening before, so a short window is enough and
// ancient rows stay untouched
const WORKED_LOOKBACK_DAYS = 3;

// Called when a receipt is generated: the battery on the receipt has
// gone out, so every recent unworked entry for that pack, on EVERY
// sheet, gets its tick. Fire-and-forget from the receipt flow.
export const markClosingWorkedFromReceipt = async (
  batteryName: string,
  receiptDay: string,
  billId: number,
  busNumber: string,
): Promise<void> => {
  const target = canon(batteryName);
  if (!target) return;

  const since = new Date(`${receiptDay}T12:00:00Z`);
  since.setDate(since.getDate() - WORKED_LOOKBACK_DAYS);
  const sinceDay = since.toISOString().slice(0, 10);

  const candidates = await BatteryClosingEntry.find({
    worked: { $ne: true },
    date: { $gte: sinceDay, $lte: receiptDay },
  });
  const matched = candidates.filter((e) => canon(e.batteryName) === target);
  if (matched.length === 0) return;

  await BatteryClosingEntry.updateMany(
    { _id: { $in: matched.map((e) => e._id) } },
    {
      $set: {
        worked: true,
        workedAt: new Date(),
        workedNote: `Receipt #${billId} on ${busNumber}`,
      },
    },
  );
};

// POST /api/battery-closing/:id/worked: the human tick, for the packs
// the system did not catch (or to undo a slip)
export const markClosingWorkedService = async (
  id: string,
  worked: boolean,
  requester: { id: string; role: string },
) => {
  const entry = await BatteryClosingEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const user = await User.findById(requester.id);
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  entry.worked = worked;
  entry.workedAt = worked ? new Date() : undefined;
  entry.workedNote = worked ? `Marked by ${name}` : "";
  await entry.save();

  return new ApiResponse(
    200,
    worked
      ? `${entry.batteryName} marked as worked`
      : `${entry.batteryName} marked as not worked yet`,
    entry.toJSON(),
  );
};

// POST /api/battery-closing: add one battery to today's closing sheet
export const createClosingEntryService = async (
  payload: ICreateClosingEntry,
  addedById: string,
  sheet: ClosingSheetKey,
) => {
  const date = dayString();
  const batteryName = payload.batteryName.trim().toUpperCase();

  // the same pack twice on one evening's sheet is a slip
  const dupe = await BatteryClosingEntry.findOne({
    date,
    batteryName,
    ...sheetFilter(sheet),
  });
  if (dupe) {
    throw new ApiError(
      409,
      `${batteryName} is already on today's closing report`,
    );
  }

  // these packs are being prepared for tomorrow, so trips are whatever
  // the staff enter by hand; nothing is derived
  const trips = payload.trips ?? 0;

  const user = await User.findById(addedById);
  const entry = await BatteryClosingEntry.create({
    date,
    sheet,
    batteryName,
    percent: payload.percent,
    voltage: payload.voltage,
    location: payload.location,
    trips,
    tripsAuto: false,
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
export const getClosingEntriesService = async (
  query: IClosingEntriesQuery,
  sheet: ClosingSheetKey,
) => {
  const date = query.date || dayString();
  const entries = await BatteryClosingEntry.find({
    date,
    ...sheetFilter(sheet),
  }).sort({
    createdAt: 1,
  });

  const byLocation: Record<string, number> = {};
  for (const loc of BATTERY_LOCATIONS) byLocation[loc.value] = 0;
  let fullyCharged = 0;
  let totalTrips = 0;
  let worked = 0;
  for (const e of entries) {
    byLocation[e.location] = (byLocation[e.location] || 0) + 1;
    if (e.percent === 100) fullyCharged += 1;
    if (e.worked) worked += 1;
    totalTrips += e.trips || 0;
  }

  return new ApiResponse(200, "Closing report retrieved successfully", {
    date,
    entries: entries.map((e) => e.toJSON()),
    totals: {
      count: entries.length,
      fullyCharged,
      worked,
      totalTrips: Math.round(totalTrips * 2) / 2,
      byLocation,
    },
  });
};

// GET /api/battery-closing/days: past sheets, newest first (managers)
export const getClosingDaysService = async (
  query: IClosingDaysQuery,
  sheet: ClosingSheetKey,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  // one row per person per day, so management sees exactly who closed
  // which batteries, the same way the battery exit form history reads
  const groupStage = {
    $group: {
      _id: { date: "$date", addedBy: "$addedBy", name: "$addedByName" },
      count: { $sum: 1 },
      fullyCharged: {
        $sum: { $cond: [{ $eq: ["$percent", 100] }, 1, 0] },
      },
      totalTrips: { $sum: { $ifNull: ["$trips", 0] } },
    },
  };

  const matchStage = { $match: sheetFilter(sheet) };

  const [days, countRows] = await Promise.all([
    BatteryClosingEntry.aggregate([
      matchStage,
      groupStage,
      { $sort: { "_id.date": -1, "_id.name": 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
    BatteryClosingEntry.aggregate([matchStage, groupStage, { $count: "n" }]),
  ]);

  return PaginatedResponse.build(
    days.map((d: any) => ({
      date: d._id.date,
      issuedByName: d._id.name || "",
      count: d.count,
      fullyCharged: d.fullyCharged,
      totalTrips: Math.round((d.totalTrips ?? 0) * 2) / 2,
    })),
    countRows[0]?.n ?? 0,
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

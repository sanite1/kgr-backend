import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import TrackerReport from "../models/TrackerReport";
import Bus from "../models/Bus";
import Receipt from "../models/Receipt";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import {
  parseTrackerReport,
  normalizeBusNumber,
} from "../helpers/trackerParser";
import {
  ICreateTrackerReport,
  ITrackerReportsQuery,
  IMileageQuery,
  ITrackerSummary,
} from "../interfaces/trackerReport.interface";

const REPORT_ID_START = Number(process.env.TRACKER_REPORT_ID_START) || 1;

// a bus "moved" when the tracker logged at least this much
const MOVED_KM = 1;

// match fleet buses by number with spacing/case ignored
const busKey = (number: string) => normalizeBusNumber(number);

// POST /api/tracker-reports/parse: turn the raw pasted message into rows
// matched against the fleet. Never writes; the console shows the result
// for the staff to correct and submit.
export const parseTrackerTextService = async (text: string) => {
  const parsed = parseTrackerReport(text);

  const buses = await Bus.find({ isActive: true });
  const byKey = new Map(buses.map((b) => [busKey(b.number), b]));

  const rows = parsed.rows.map((row) => {
    const match = byKey.get(busKey(row.busNumber));
    const issues = [...row.issues];
    if (!match) {
      issues.push(`No registered bus matches "${row.busNumber}"`);
    }
    return {
      busId: match ? String(match._id) : undefined,
      busNumber: match ? match.number : row.busNumber,
      status: row.status,
      startTime: row.startTime,
      endTime: row.endTime,
      mileageKm: row.mileageKm,
      issues,
    };
  });

  return new ApiResponse(200, "Report parsed successfully", {
    date: parsed.date || dayString(),
    dateDetected: !!parsed.date,
    rows,
    issues: parsed.issues,
    parsedCount: rows.length,
    matchedCount: rows.filter((r) => r.busId).length,
  });
};

// derives the operator's daily summary from the fleet's tracker metadata
const buildSummary = async (
  reportedNumbers: string[],
  totalMileageKm: number,
): Promise<ITrackerSummary> => {
  const buses = await Bus.find({ isActive: true });
  const reported = new Set(reportedNumbers.map(busKey));

  const notActiveTracked: string[] = [];
  const noTracker: string[] = [];
  const badTracker: string[] = [];
  let totalDevices = 0;

  for (const bus of buses) {
    const wasReported = reported.has(busKey(bus.number));
    if (bus.hasTracker) totalDevices += 1;
    if (wasReported) continue;
    if (!bus.hasTracker) noTracker.push(bus.number);
    else if (bus.trackerHealth !== "ok") badTracker.push(bus.number);
    else notActiveTracked.push(bus.number);
  }

  return {
    totalDevices,
    activeCount: reportedNumbers.length,
    notActiveTracked,
    noTracker,
    badTracker,
    totalMileageKm: Math.round(totalMileageKm * 1000) / 1000,
  };
};

// POST /api/tracker-reports: save one day's report
export const createTrackerReportService = async (
  payload: ICreateTrackerReport,
  submittedById: string,
) => {
  const existing = await TrackerReport.findOne({ date: payload.date });
  if (existing && !payload.replace) {
    throw new ApiError(
      409,
      `A tracker report for ${payload.date} exists (#${existing.reportId}). Submit with replace to overwrite it.`,
    );
  }

  const submitter = await User.findById(submittedById);
  const submittedByName = submitter
    ? `${submitter.firstName} ${submitter.lastName}`.trim()
    : "";

  // resolve buses: by id when the console matched them, else by number
  const buses = await Bus.find({ isActive: true });
  const byId = new Map(buses.map((b) => [String(b._id), b]));
  const byNumber = new Map(buses.map((b) => [busKey(b.number), b]));

  const rows = [];
  let totalMileage = 0;
  for (const input of payload.rows) {
    const bus =
      (input.busId && byId.get(input.busId)) ||
      byNumber.get(busKey(input.busNumber));
    rows.push({
      bus: bus?._id,
      busNumber: bus ? bus.number : normalizeBusNumber(input.busNumber),
      status: (input.status || "active").toLowerCase(),
      startTime: input.startTime || "",
      endTime: input.endTime || "",
      mileageKm: input.mileageKm,
      note: input.note || "",
    });
    totalMileage += input.mileageKm;
  }

  const summary = await buildSummary(
    rows.map((r) => r.busNumber),
    totalMileage,
  );

  if (existing) {
    existing.rows = rows as any;
    existing.summary = summary as any;
    existing.submittedBy = submittedById as any;
    existing.submittedByName = submittedByName;
    existing.rawText = payload.rawText || existing.rawText;
    existing.notes = payload.notes ?? existing.notes;
    await existing.save();
    return new ApiResponse(
      200,
      `Tracker report for ${payload.date} replaced (${rows.length} buses)`,
      existing.toJSON(),
    );
  }

  const reportId = await nextSequence("tracker_report_id", REPORT_ID_START);
  const report = await TrackerReport.create({
    reportId,
    date: payload.date,
    rows,
    summary,
    submittedBy: submittedById,
    submittedByName,
    rawText: payload.rawText || "",
    notes: payload.notes || "",
  });

  return new ApiResponse(
    201,
    `Tracker report #${reportId} saved (${rows.length} buses)`,
    report.toJSON(),
  );
};

// GET /api/tracker-reports
export const getTrackerReportsService = async (query: ITrackerReportsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;

  const [reports, totalItems] = await Promise.all([
    TrackerReport.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("-rows -rawText")
      .populate("submittedBy", "firstName lastName"),
    TrackerReport.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    reports.map((r) => r.toJSON()),
    totalItems,
    page,
    pageSize,
    "Tracker reports retrieved successfully",
  );
};

// GET /api/tracker-reports/:id - the day's rows plus the receipt
// cross-check: movement without a ticket, and tickets without movement.
export const getTrackerReportService = async (id: string) => {
  const report = await TrackerReport.findById(id).populate(
    "submittedBy",
    "firstName lastName",
  );
  if (!report) throw new ApiError(404, "Tracker report not found");

  const receiptBuses = await Receipt.distinct("busNumber", {
    date: report.date,
    status: { $ne: "void" },
  });
  const receiptSet = new Set(receiptBuses.map(busKey));
  const movedSet = new Set(
    report.rows
      .filter((r) => r.mileageKm >= MOVED_KM)
      .map((r) => busKey(r.busNumber)),
  );

  // moved on the tracker but never bought a ticket
  const movedNoReceipt = report.rows
    .filter(
      (r) => r.mileageKm >= MOVED_KM && !receiptSet.has(busKey(r.busNumber)),
    )
    .map((r) => ({ busNumber: r.busNumber, mileageKm: r.mileageKm }));

  // ticketed but the tracker barely saw them move
  const receiptNoMovement = receiptBuses.filter(
    (n) => !movedSet.has(busKey(n)),
  );

  return new ApiResponse(200, "Tracker report retrieved successfully", {
    ...report.toJSON(),
    crossCheck: { movedNoReceipt, receiptNoMovement },
  });
};

// GET /api/tracker-reports/mileage?month=YYYY-MM: per-bus totals
export const getMileageSummaryService = async (query: IMileageQuery) => {
  const month = query.month || dayString().slice(0, 7);
  const monthRe = new RegExp(`^${month}-`);

  const rows = await TrackerReport.aggregate([
    { $match: { date: monthRe } },
    { $unwind: "$rows" },
    {
      $group: {
        _id: "$rows.busNumber",
        days: { $sum: 1 },
        totalKm: { $sum: "$rows.mileageKm" },
        maxKm: { $max: "$rows.mileageKm" },
      },
    },
    { $sort: { totalKm: -1 } },
  ]);

  const daysReported = await TrackerReport.countDocuments({
    date: monthRe,
  });

  return new ApiResponse(200, "Mileage summary retrieved successfully", {
    month,
    daysReported,
    buses: rows.map((r: any) => ({
      busNumber: r._id,
      days: r.days,
      totalKm: Math.round(r.totalKm * 100) / 100,
      avgKm: r.days ? Math.round((r.totalKm / r.days) * 100) / 100 : 0,
      maxKm: Math.round(r.maxKm * 100) / 100,
    })),
  });
};

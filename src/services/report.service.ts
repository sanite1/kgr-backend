import ApiResponse from "../errors/apiResponse";
import Receipt from "../models/Receipt";
import Payment from "../models/Payment";
import PartRequest from "../models/PartRequest";
import RepairJob from "../models/RepairJob";
import { dayString } from "../helpers/day";
import {
  IMonthlyReportQuery,
  IExpenseReportQuery,
} from "../interfaces/report.interface";

// GET /api/reports/monthly: one row per business day of the month
export const getMonthlyReportService = async (query: IMonthlyReportQuery) => {
  const month = query.month || dayString().slice(0, 7);
  const prefix = new RegExp(`^${month}-`);

  const [receiptRows, paymentRows] = await Promise.all([
    Receipt.aggregate([
      { $match: { date: prefix } },
      {
        $group: {
          _id: "$date",
          issued: { $sum: { $cond: [{ $ne: ["$status", "void"] }, 1, 0] } },
          expected: {
            $sum: {
              $cond: [
                { $ne: ["$status", "void"] },
                { $toDouble: "$expectedAmount" },
                0,
              ],
            },
          },
          voided: { $sum: { $cond: [{ $eq: ["$status", "void"] }, 1, 0] } },
          notCheckedIn: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "void"] },
                    { $ne: ["$checkedIn", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { date: prefix } },
      {
        $group: {
          _id: "$date",
          collected: { $sum: { $toDouble: "$amount" } },
          fromToday: {
            $sum: {
              $cond: [
                { $eq: ["$receiptDate", "$date"] },
                { $toDouble: "$amount" },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  type Row = {
    date: string;
    issued: number;
    expected: number;
    collected: number;
    fromToday: number;
    fromArrears: number;
    outstanding: number;
    voided: number;
    notCheckedIn: number;
  };

  const byDate = new Map<string, Row>();
  const blank = (date: string): Row => ({
    date,
    issued: 0,
    expected: 0,
    collected: 0,
    fromToday: 0,
    fromArrears: 0,
    outstanding: 0,
    voided: 0,
    notCheckedIn: 0,
  });

  for (const r of receiptRows) {
    const row = byDate.get(r._id) || blank(r._id);
    row.issued = r.issued;
    row.expected = r.expected;
    row.voided = r.voided;
    row.notCheckedIn = r.notCheckedIn;
    byDate.set(r._id, row);
  }
  for (const p of paymentRows) {
    const row = byDate.get(p._id) || blank(p._id);
    row.collected = p.collected;
    row.fromToday = p.fromToday;
    row.fromArrears = p.collected - p.fromToday;
    byDate.set(p._id, row);
  }

  const days = Array.from(byDate.values())
    .map((row) => ({
      ...row,
      outstanding: row.expected - row.fromToday,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totals = days.reduce(
    (acc, row) => ({
      issued: acc.issued + row.issued,
      expected: acc.expected + row.expected,
      collected: acc.collected + row.collected,
      fromToday: acc.fromToday + row.fromToday,
      fromArrears: acc.fromArrears + row.fromArrears,
      outstanding: acc.outstanding + row.outstanding,
      voided: acc.voided + row.voided,
      notCheckedIn: acc.notCheckedIn + row.notCheckedIn,
    }),
    {
      issued: 0,
      expected: 0,
      collected: 0,
      fromToday: 0,
      fromArrears: 0,
      outstanding: 0,
      voided: 0,
      notCheckedIn: 0,
    },
  );

  const toStrings = (row: Record<string, any>) => ({
    ...row,
    expected: String(row.expected),
    collected: String(row.collected),
    fromToday: String(row.fromToday),
    fromArrears: String(row.fromArrears),
    outstanding: String(row.outstanding),
  });

  return new ApiResponse(200, "Monthly report retrieved successfully", {
    month,
    days: days.map(toStrings),
    totals: toStrings(totals),
  });
};

// GET /api/reports/expenses: approved requests + completed repairs per bus
export const getExpenseReportService = async (query: IExpenseReportQuery) => {
  const range = (field: string) => {
    if (!query.from && !query.to) return {};
    const r: Record<string, Date> = {};
    if (query.from) r.$gte = new Date(`${query.from}T00:00:00Z`);
    if (query.to) r.$lte = new Date(`${query.to}T23:59:59Z`);
    return { [field]: r };
  };

  const [requestRows, repairRows] = await Promise.all([
    PartRequest.aggregate([
      { $match: { status: "approved", ...range("decidedAt") } },
      {
        $group: {
          _id: "$busNumber",
          count: { $sum: 1 },
          total: { $sum: { $toDouble: "$amount" } },
        },
      },
    ]),
    RepairJob.aggregate([
      { $match: { status: "completed", ...range("closedAt") } },
      {
        $group: {
          // battery-only jobs have no bus; they report as the workshop
          _id: { $ifNull: ["$busNumber", "Workshop"] },
          count: { $sum: 1 },
          parts: { $sum: { $toDouble: "$partsCost" } },
          labor: { $sum: { $toDouble: "$laborCost" } },
          total: { $sum: { $toDouble: "$totalCost" } },
        },
      },
    ]),
  ]);

  type Row = {
    busNumber: string;
    requestsCount: number;
    requestsTotal: number;
    repairsCount: number;
    repairsParts: number;
    repairsLabor: number;
    repairsTotal: number;
    total: number;
  };

  const byBus = new Map<string, Row>();
  const blank = (busNumber: string): Row => ({
    busNumber,
    requestsCount: 0,
    requestsTotal: 0,
    repairsCount: 0,
    repairsParts: 0,
    repairsLabor: 0,
    repairsTotal: 0,
    total: 0,
  });

  for (const r of requestRows) {
    const row = byBus.get(r._id) || blank(r._id);
    row.requestsCount = r.count;
    row.requestsTotal = r.total;
    byBus.set(r._id, row);
  }
  for (const r of repairRows) {
    const row = byBus.get(r._id) || blank(r._id);
    row.repairsCount = r.count;
    row.repairsParts = r.parts;
    row.repairsLabor = r.labor;
    row.repairsTotal = r.total;
    byBus.set(r._id, row);
  }

  const buses = Array.from(byBus.values())
    .map((row) => ({ ...row, total: row.requestsTotal + row.repairsTotal }))
    .sort((a, b) => b.total - a.total);

  const totals = buses.reduce(
    (acc, row) => ({
      requestsCount: acc.requestsCount + row.requestsCount,
      requestsTotal: acc.requestsTotal + row.requestsTotal,
      repairsCount: acc.repairsCount + row.repairsCount,
      repairsParts: acc.repairsParts + row.repairsParts,
      repairsLabor: acc.repairsLabor + row.repairsLabor,
      repairsTotal: acc.repairsTotal + row.repairsTotal,
      total: acc.total + row.total,
    }),
    {
      requestsCount: 0,
      requestsTotal: 0,
      repairsCount: 0,
      repairsParts: 0,
      repairsLabor: 0,
      repairsTotal: 0,
      total: 0,
    },
  );

  const toStrings = (row: Record<string, any>) => ({
    ...row,
    requestsTotal: String(row.requestsTotal),
    repairsParts: String(row.repairsParts),
    repairsLabor: String(row.repairsLabor),
    repairsTotal: String(row.repairsTotal),
    total: String(row.total),
  });

  return new ApiResponse(200, "Expense report retrieved successfully", {
    from: query.from || null,
    to: query.to || null,
    buses: buses.map(toStrings),
    totals: toStrings(totals),
  });
};

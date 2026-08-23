import mongoose from "mongoose";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import FinanceEntry from "../models/FinanceEntry";
import Receipt from "../models/Receipt";
import Expenditure from "../models/Expenditure";
import User from "../models/User";
import logger from "../config/logger";
import { dayString } from "../helpers/day";
import { nextSequence } from "../helpers/sequence";
import { buildPeriodBuckets, bucketKeyFor } from "../helpers/periodBuckets";
import {
  ICreateFinanceEntry,
  IBuyDown,
  IFinanceEntriesQuery,
  IMonthBreakdown,
} from "../interfaces/finance.interface";

// One-time migration: admins with customized tab access saved before
// this module existed would otherwise never see it. Admin-only module,
// so only admin overrides are touched, exactly once.
const grantFinanceOnce = async () => {
  const run = await nextSequence("migration_access_finance", 1);
  if (run !== 1) return;
  const res = await User.updateMany(
    { role: "admin", access: { $type: "array" } },
    { $addToSet: { access: "finance" } },
  );
  logger.info(`Finance access granted to ${res.modifiedCount} admin(s)`);
};
const runGrant = () =>
  grantFinanceOnce().catch((error: Error) =>
    logger.error("Finance access migration failed", { message: error.message }),
  );
if (mongoose.connection.readyState === 1) {
  void runGrant();
} else {
  mongoose.connection.once("connected", () => void runGrant());
}

const money = (n: number) => Math.round(n * 100) / 100;

// collected revenue per day and completed expenditures per day, summed
// over [from, to] as YYYY-MM-DD strings
const dailyMoney = async (from: string, to: string) => {
  const [rev, exp] = await Promise.all([
    Receipt.aggregate([
      { $match: { date: { $gte: from, $lte: to }, status: "paid" } },
      {
        $group: {
          _id: "$date",
          amount: {
            $sum: {
              $toDouble: { $ifNull: ["$amountPaid", "$expectedAmount"] },
            },
          },
        },
      },
    ]),
    Expenditure.aggregate([
      { $match: { date: { $gte: from, $lte: to }, status: "completed" } },
      { $group: { _id: "$date", amount: { $sum: { $toDouble: "$amount" } } } },
    ]),
  ]);
  return {
    revenueByDay: new Map<string, number>(
      rev.map((r: any) => [r._id, r.amount]),
    ),
    expensesByDay: new Map<string, number>(
      exp.map((r: any) => [r._id, r.amount]),
    ),
  };
};

const monthKey = (date: string) => date.slice(0, 7);

// the profit formula for a run of months: revenue - expenditures -
// salaries = profit; a buy-down carves a slice off; the rest is kept
export const monthBreakdowns = async (
  months: string[],
): Promise<IMonthBreakdown[]> => {
  if (months.length === 0) return [];
  const sorted = [...months].sort();
  const from = `${sorted[0]}-01`;
  const to = `${sorted[sorted.length - 1]}-31`;
  const [{ revenueByDay, expensesByDay }, entries] = await Promise.all([
    dailyMoney(from, to),
    FinanceEntry.find({
      kind: { $in: ["salary", "repayment"] },
      month: { $in: months },
    }),
  ]);

  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();
  for (const [d, a] of revenueByDay) {
    revenue.set(monthKey(d), (revenue.get(monthKey(d)) ?? 0) + a);
  }
  for (const [d, a] of expensesByDay) {
    expenses.set(monthKey(d), (expenses.get(monthKey(d)) ?? 0) + a);
  }
  const salary = new Map<string, number>();
  const buyDown = new Map<string, number>();
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.kind === "salary") {
      salary.set(e.month, (salary.get(e.month) ?? 0) + amt);
    } else if (e.fromProfitPercent !== undefined) {
      buyDown.set(e.month, (buyDown.get(e.month) ?? 0) + amt);
    }
  }

  return months.map((m) => {
    const r = revenue.get(m) ?? 0;
    const x = expenses.get(m) ?? 0;
    const s = salary.get(m) ?? 0;
    const profit = r - x - s;
    const b = buyDown.get(m) ?? 0;
    return {
      month: m,
      revenue: money(r),
      expenses: money(x),
      salary: money(s),
      profit: money(profit),
      buyDown: money(b),
      kept: money(profit - b),
    };
  });
};

const lastMonths = (n: number): string[] => {
  const today = dayString();
  const now = new Date(`${today}T12:00:00Z`);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
};

// the month every record began: the earliest receipt, expenditure or
// finance entry, so "retained profit" covers the whole history
const earliestMonth = async (): Promise<string> => {
  const [r, x, f] = await Promise.all([
    Receipt.findOne().sort({ date: 1 }).select("date"),
    Expenditure.findOne().sort({ date: 1 }).select("date"),
    FinanceEntry.findOne().sort({ date: 1 }).select("date"),
  ]);
  const dates = [r?.date, x?.date, f?.date].filter(Boolean) as string[];
  return (dates.sort()[0] ?? dayString()).slice(0, 7);
};

const monthsBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
};

// GET /api/finance/overview: the tiles, this month's formula, and the
// up-or-down verdict
export const getFinanceOverviewService = async () => {
  const thisMonth = dayString().slice(0, 7);
  const first = await earliestMonth();
  const allMonths = monthsBetween(first, thisMonth);

  const [breakdowns, entries] = await Promise.all([
    monthBreakdowns(allMonths),
    FinanceEntry.find({
      kind: { $in: ["investment", "loan", "other_debt", "repayment"] },
    }),
  ]);

  let invested = 0;
  let loans = 0;
  let otherDebt = 0;
  let repaid = 0;
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.kind === "investment") invested += amt;
    else if (e.kind === "loan") loans += amt;
    else if (e.kind === "other_debt") otherDebt += amt;
    else repaid += amt;
  }
  const debtOutstanding = loans + otherDebt - repaid;
  const retainedProfit = breakdowns.reduce((s, b) => s + b.kept, 0);

  // this month is still being written; the honest comparison is the
  // last two COMPLETED months. The month in progress is shown as
  // "so far" and never judged against a finished one.
  const current = breakdowns[breakdowns.length - 1];
  const completed = breakdowns.slice(0, -1);
  const latest = completed[completed.length - 1];
  const before = completed[completed.length - 2];
  const profitChange =
    latest && before && before.profit !== 0
      ? ((latest.profit - before.profit) / Math.abs(before.profit)) * 100
      : null;
  // repaid this calendar month: by the date the money moved, not by the
  // profit month a buy-down was carved from
  const repaidThisMonth = entries
    .filter((e) => e.kind === "repayment" && monthKey(e.date) === thisMonth)
    .reduce((s, e) => s + Number(e.amount), 0);

  // the verdict: latest completed month in the red, or profit falling
  // more than 5%, is "down"; rising more than 5%, or steady profit
  // while debt is being paid off, is "up"; anything else is "steady"
  let verdict: "up" | "down" | "steady" = "steady";
  if (
    latest &&
    (latest.profit < 0 || (profitChange !== null && profitChange < -5))
  ) {
    verdict = "down";
  } else if (
    (profitChange !== null && profitChange > 5) ||
    (latest && latest.profit > 0 && repaidThisMonth > 0)
  ) {
    verdict = "up";
  }

  return new ApiResponse(200, "Finance overview retrieved successfully", {
    totals: {
      invested: money(invested),
      loans: money(loans),
      otherDebt: money(otherDebt),
      repaid: money(repaid),
      debtOutstanding: money(debtOutstanding),
      retainedProfit: money(retainedProfit),
    },
    thisMonth: current,
    lastMonth: latest ?? null,
    verdict: {
      direction: verdict,
      profitChangePct: profitChange === null ? null : money(profitChange),
      // which two finished months the change compares
      compared:
        latest && before
          ? { latest: latest.month, before: before.month }
          : null,
      repaidThisMonth: money(repaidThisMonth),
    },
  });
};

// GET /api/finance/months?limit=12
export const getFinanceMonthsService = async (limit: number) => {
  const months = lastMonths(Math.min(36, Math.max(1, limit || 12)));
  const rows = await monthBreakdowns(months);
  return new ApiResponse(200, "Finance months retrieved successfully", {
    months: rows.reverse(),
  });
};

// GET /api/finance/entries
export const getFinanceEntriesService = async (query: IFinanceEntriesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const filter: Record<string, any> = {};
  if (query.kind) filter.kind = query.kind;

  const [entries, totalItems] = await Promise.all([
    FinanceEntry.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("loan", "label amount date"),
    FinanceEntry.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    entries.map((e) => e.toJSON()),
    totalItems,
    page,
    pageSize,
    "Finance entries retrieved successfully",
  );
};

// POST /api/finance/entries
export const createFinanceEntryService = async (
  payload: ICreateFinanceEntry,
  byId: string,
) => {
  if (!(payload.amount > 0)) {
    throw new ApiError(400, "Amount must be greater than zero");
  }
  const date = payload.date || dayString();
  const month =
    payload.kind === "salary"
      ? payload.month || monthKey(date)
      : monthKey(date);

  let loanId: string | undefined;
  if (payload.kind === "repayment" && payload.loanId) {
    const loan = await FinanceEntry.findById(payload.loanId);
    if (!loan || loan.kind !== "loan") {
      throw new ApiError(404, "That loan was not found");
    }
    loanId = String(loan._id);
  }

  const user = await User.findById(byId);
  const entry = await FinanceEntry.create({
    kind: payload.kind,
    amount: String(payload.amount),
    date,
    month,
    label: payload.label?.trim() || "",
    note: payload.note?.trim() || "",
    loan: loanId,
    by: byId,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });

  const LABEL: Record<string, string> = {
    investment: "Investment",
    loan: "Loan",
    repayment: "Repayment",
    salary: "Salary",
    other_debt: "Debt",
  };
  return new ApiResponse(
    201,
    `${LABEL[payload.kind]} of ${payload.amount} recorded`,
    entry.toJSON(),
  );
};

// POST /api/finance/buy-down: carve a percentage of a month's profit
// into a loan repayment. The month must actually have profit left.
export const buyDownService = async (payload: IBuyDown, byId: string) => {
  if (!(payload.percent > 0 && payload.percent <= 100)) {
    throw new ApiError(400, "Percent must be between 1 and 100");
  }
  const [row] = await monthBreakdowns([payload.month]);
  if (!row || row.profit <= 0) {
    throw new ApiError(400, `${payload.month} has no profit to buy down from`);
  }
  if (row.kept <= 0) {
    throw new ApiError(
      400,
      `${payload.month}'s profit is already fully used for buy-downs`,
    );
  }
  const amount = money(
    Math.min(row.kept, (row.profit * payload.percent) / 100),
  );
  if (amount <= 0) throw new ApiError(400, "That percentage rounds to nothing");

  let loanId: string | undefined;
  if (payload.loanId) {
    const loan = await FinanceEntry.findById(payload.loanId);
    if (!loan || loan.kind !== "loan") {
      throw new ApiError(404, "That loan was not found");
    }
    loanId = String(loan._id);
  }

  const user = await User.findById(byId);
  const entry = await FinanceEntry.create({
    kind: "repayment",
    amount: String(amount),
    date: dayString(),
    month: payload.month,
    label: `${payload.percent}% of ${payload.month} profit`,
    note: payload.note?.trim() || "",
    loan: loanId,
    fromProfitPercent: payload.percent,
    by: byId,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });

  return new ApiResponse(
    201,
    `Bought down ${amount} (${payload.percent}% of ${payload.month} profit)`,
    entry.toJSON(),
  );
};

// DELETE /api/finance/entries/:id
export const deleteFinanceEntryService = async (id: string) => {
  const entry = await FinanceEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  if (entry.kind === "loan") {
    const tied = await FinanceEntry.countDocuments({ loan: entry._id });
    if (tied > 0) {
      throw new ApiError(
        400,
        `This loan has ${tied} repayment(s) tied to it; remove those first`,
      );
    }
  }
  await entry.deleteOne();
  return new ApiResponse(200, "Entry removed", undefined);
};

// GET /api/finance/series?range=: the two dashboard charts. Performance
// is revenue vs costs (expenditures + salaries prorated by day) with
// profit on top; debt is the balance outstanding at the end of each
// bucket with what was repaid inside it.
export const getFinanceSeriesService = async (rawRange: string) => {
  const firstEntry = await FinanceEntry.findOne()
    .sort({ date: 1 })
    .select("date");
  const firstReceipt = await Receipt.findOne().sort({ date: 1 }).select("date");
  const earliest = [firstEntry?.date, firstReceipt?.date]
    .filter(Boolean)
    .sort()[0] as string | undefined;
  const { range, buckets } = buildPeriodBuckets(rawRange, earliest);
  if (buckets.length === 0) {
    return new ApiResponse(200, "Series retrieved successfully", {
      range,
      performance: [],
      debt: [],
    });
  }
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;

  const [{ revenueByDay, expensesByDay }, salaries, debtEntries] =
    await Promise.all([
      dailyMoney(from, to),
      FinanceEntry.find({
        kind: "salary",
        month: { $gte: monthKey(from), $lte: monthKey(to) },
      }),
      FinanceEntry.find({
        kind: { $in: ["loan", "other_debt", "repayment"] },
      }).sort({ date: 1 }),
    ]);

  const perf = new Map(buckets.map((b) => [b.key, { revenue: 0, costs: 0 }]));
  for (const [d, a] of revenueByDay) {
    const k = bucketKeyFor(buckets, d);
    if (k) perf.get(k)!.revenue += a;
  }
  for (const [d, a] of expensesByDay) {
    const k = bucketKeyFor(buckets, d);
    if (k) perf.get(k)!.costs += a;
  }
  // a month's salary is spread evenly over its days so weekly and daily
  // views carry their fair share instead of one spike
  for (const s of salaries) {
    const [y, m] = s.month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const perDay = Number(s.amount) / daysInMonth;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = `${s.month}-${String(day).padStart(2, "0")}`;
      const k = bucketKeyFor(buckets, d);
      if (k) perf.get(k)!.costs += perDay;
    }
  }

  // debt outstanding at the end of each bucket: everything borrowed up
  // to that day minus everything repaid up to that day
  const debt = buckets.map((b) => {
    let owed = 0;
    let repaidInBucket = 0;
    for (const e of debtEntries) {
      if (e.date > b.end) break;
      const amt = Number(e.amount);
      if (e.kind === "repayment") {
        owed -= amt;
        if (e.date >= b.start) repaidInBucket += amt;
      } else {
        owed += amt;
      }
    }
    return {
      key: b.key,
      label: b.label,
      outstanding: String(money(Math.max(0, owed))),
      repaid: String(money(repaidInBucket)),
    };
  });

  return new ApiResponse(200, "Series retrieved successfully", {
    range,
    performance: buckets.map((b) => {
      const p = perf.get(b.key)!;
      return {
        key: b.key,
        label: b.label,
        revenue: String(money(p.revenue)),
        costs: String(money(p.costs)),
        profit: String(money(p.revenue - p.costs)),
      };
    }),
    debt,
  });
};

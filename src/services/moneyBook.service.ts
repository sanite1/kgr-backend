import mongoose from "mongoose";
import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import MoneyBookEntry from "../models/MoneyBookEntry";
import MoneyBookCategory from "../models/MoneyBookCategory";
import MoneyBookAccount from "../models/MoneyBookAccount";
import User from "../models/User";
import Counter from "../models/Counter";
import logger from "../config/logger";
import { dayString } from "../helpers/day";
import {
  MONEY_BOOK_SEED_CATEGORIES,
  MONEY_BOOK_SEED_ACCOUNTS,
  MONEY_BOOK_SEED_LINES,
} from "../config/moneyBookSeed";
import {
  ICreateMoneyBookEntry,
  IUpdateMoneyBookEntry,
  IMoneyBookEntriesQuery,
  IMoneyBookReportsQuery,
  ICreateMoneyBookCategory,
} from "../interfaces/moneyBook.interface";

const money = (n: number) => Math.round(n * 100) / 100;
const monthOf = (date: string) => date.slice(0, 7);

// One-time setup, gated by the sequence counter so it runs exactly once:
// the starting categories and accounts, the handwritten history, and
// the access key for managers/admins whose tab list was customized
// before the module existed.
const SEED_FLAG = "money_book_seed_done";
const seedOnce = async () => {
  // the flag is written only after everything landed, so a crash or a
  // database with no user yet simply tries again on the next boot
  if (await Counter.exists({ key: SEED_FLAG })) return;
  const alreadySeeded = await MoneyBookEntry.exists({ seeded: true });
  if (alreadySeeded) {
    await Counter.create({ key: SEED_FLAG, value: 1 });
    return;
  }

  const admin =
    (await User.findOne({ role: "admin" }).sort({ createdAt: 1 })) ??
    (await User.findOne());
  if (!admin) {
    logger.info("Money Book seed deferred: no user exists yet");
    return;
  }
  // a partial earlier attempt leaves nothing behind
  await Promise.all([
    MoneyBookCategory.deleteMany({}),
    MoneyBookAccount.deleteMany({}),
  ]);

  const categories = await MoneyBookCategory.insertMany(
    MONEY_BOOK_SEED_CATEGORIES.map((c, i) => ({
      name: c.name,
      color: c.color,
      sortOrder: i,
    })),
  );
  const byKey = new Map(
    MONEY_BOOK_SEED_CATEGORIES.map((c, i) => [c.key, categories[i]]),
  );
  const accounts = await MoneyBookAccount.insertMany(
    MONEY_BOOK_SEED_ACCOUNTS.map((name, i) => ({ name, sortOrder: i })),
  );
  const online = accounts[2];

  await MoneyBookEntry.insertMany(
    MONEY_BOOK_SEED_LINES.map((line) => {
      const cat = byKey.get(line.category)!;
      return {
        type: "expense",
        date: `${line.month}-01`,
        month: line.month,
        title: line.title,
        amount: String(line.amount),
        quantity: line.quantity,
        unitPrice:
          line.quantity && line.quantity > 0
            ? String(money(line.amount / line.quantity))
            : undefined,
        usdAmount: line.usd !== undefined ? String(line.usd) : undefined,
        category: cat._id,
        categoryName: cat.name,
        account: online._id,
        accountName: online.name,
        note: "From the handwritten expenses sheet",
        recurring: false,
        seeded: true,
        by: admin._id,
        byName: `${admin.firstName} ${admin.lastName}`.trim(),
      };
    }),
  );

  const res = await User.updateMany(
    { role: { $in: ["admin", "manager"] }, access: { $type: "array" } },
    { $addToSet: { access: "money_book" } },
  );
  await Counter.create({ key: SEED_FLAG, value: 1 });
  logger.info(
    `Money Book seeded: ${MONEY_BOOK_SEED_LINES.length} lines, access granted to ${res.modifiedCount} user(s)`,
  );
};
const runSeed = () =>
  seedOnce().catch((error: Error) =>
    logger.error("Money Book seeding failed", { message: error.message }),
  );
if (mongoose.connection.readyState === 1) {
  void runSeed();
} else {
  mongoose.connection.once("connected", () => void runSeed());
}

// Recurring entries: a template repeats on the same day every month
// after its own. Copies are written lazily the first time a month is
// opened, so nothing needs a clock running in the background.
const materializeRecurring = async (month: string, byId: string) => {
  const templates = await MoneyBookEntry.find({
    recurring: true,
    recurringOf: { $exists: false },
    month: { $lt: month },
  });
  if (templates.length === 0) return;
  const existing = await MoneyBookEntry.find({
    recurringOf: { $in: templates.map((t) => t._id) },
    month,
  }).select("recurringOf");
  const have = new Set(existing.map((e) => String(e.recurringOf)));
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const copies = templates
    .filter((t) => !have.has(String(t._id)))
    .map((t) => {
      const day = Math.min(Number(t.date.slice(8, 10)), daysInMonth);
      return {
        type: t.type,
        date: `${month}-${String(day).padStart(2, "0")}`,
        month,
        title: t.title,
        amount: t.amount,
        quantity: t.quantity,
        unitPrice: t.unitPrice,
        usdAmount: t.usdAmount,
        category: t.category,
        categoryName: t.categoryName,
        account: t.account,
        accountName: t.accountName,
        note: t.note,
        recurring: false,
        recurringOf: t._id,
        seeded: false,
        by: byId,
        byName: t.byName,
      };
    });
  if (copies.length > 0) {
    // the unique (recurringOf, month) index makes a concurrent double
    // insert harmless: the loser's duplicates are simply dropped
    await MoneyBookEntry.insertMany(copies, { ordered: false }).catch(
      (error: any) => {
        if (error?.code !== 11000 && error?.writeErrors?.[0]?.code !== 11000) {
          throw error;
        }
      },
    );
  }
};

// every month from the oldest template up to `until`, so reports and
// the finance formula never miss a copy for a month nobody opened yet
export const materializeRecurringUpTo = async (until: string, byId: string) => {
  const oldest = await MoneyBookEntry.findOne({
    recurring: true,
    recurringOf: { $exists: false },
  })
    .sort({ month: 1 })
    .select("month");
  if (!oldest) return;
  let cursor = oldest.month;
  const [y, m] = cursor.split("-").map(Number);
  cursor = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  let guard = 0;
  while (cursor <= until && guard < 120) {
    await materializeRecurring(cursor, byId);
    const [cy, cm] = cursor.split("-").map(Number);
    cursor = new Date(Date.UTC(cy, cm, 1)).toISOString().slice(0, 7);
    guard += 1;
  }
};

const prevMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
};

// GET /api/money-book/overview?month=
export const getMoneyBookOverviewService = async (
  monthRaw: string | undefined,
  byId: string,
) => {
  const month = monthRaw || dayString().slice(0, 7);
  const last = prevMonth(month);
  await materializeRecurringUpTo(month, byId);

  // the twelve-month strip on the card: it ends at the current month
  // and only slides back when the selected month is older than that
  const thisMonth = dayString().slice(0, 7);
  const addMonths = (ym: string, by: number) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
  };
  let stripEnd = month > thisMonth ? month : thisMonth;
  let stripStart = addMonths(stripEnd, -11);
  if (month < stripStart) {
    stripStart = month;
    stripEnd = addMonths(month, 11);
  }
  const stripMonths: string[] = [];
  for (let i = 0; i < 12; i += 1) stripMonths.push(addMonths(stripStart, i));

  const [entries, lastEntries, categories, stripAgg] = await Promise.all([
    MoneyBookEntry.find({ month }).sort({ date: -1, createdAt: -1 }),
    MoneyBookEntry.find({ month: last, type: "expense" }).select("amount"),
    MoneyBookCategory.find().sort({ sortOrder: 1, name: 1 }),
    MoneyBookEntry.aggregate([
      { $match: { month: { $in: stripMonths }, type: "expense" } },
      { $group: { _id: "$month", amount: { $sum: { $toDouble: "$amount" } } } },
    ]),
  ]);
  const stripBy = new Map<string, number>(
    stripAgg.map((r: any) => [r._id, r.amount]),
  );

  let expense = 0;
  let income = 0;
  const byDay = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.type === "expense") {
      expense += amt;
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + amt);
      const key = e.category ? String(e.category) : "";
      byCategory.set(key, (byCategory.get(key) ?? 0) + amt);
    } else {
      income += amt;
    }
  }
  const lastExpense = lastEntries.reduce((s, e) => s + Number(e.amount), 0);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { date: d, amount: money(byDay.get(d) ?? 0) };
  });

  const budgets = categories
    .filter((c) => c.monthlyBudget !== undefined && c.monthlyBudget !== null)
    .map((c) => ({
      categoryId: String(c._id),
      name: c.name,
      color: c.color,
      budget: c.monthlyBudget as number,
      spent: money(byCategory.get(String(c._id)) ?? 0),
    }));

  return new ApiResponse(200, "Money book overview retrieved successfully", {
    month,
    totals: {
      expense: money(expense),
      income: money(income),
      net: money(income - expense),
      lastMonthExpense: money(lastExpense),
      changePct:
        lastExpense > 0
          ? money(((expense - lastExpense) / lastExpense) * 100)
          : null,
      count: entries.length,
    },
    daily,
    monthly: stripMonths.map((m) => ({
      month: m,
      expense: money(stripBy.get(m) ?? 0),
    })),
    budgets,
    recent: entries.slice(0, 30).map((e) => e.toJSON()),
  });
};

// GET /api/money-book/entries?month=&search=&categoryId=&accountId=&type=
export const getMoneyBookEntriesService = async (
  query: IMoneyBookEntriesQuery,
  byId: string,
) => {
  const month = query.month || dayString().slice(0, 7);
  await materializeRecurring(month, byId);
  const filter: Record<string, any> = { month };
  if (query.type) filter.type = query.type;
  if (query.categoryId) filter.category = query.categoryId;
  if (query.accountId) filter.account = query.accountId;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { title: pattern },
      { note: pattern },
      { categoryName: pattern },
    ];
  }
  const entries = await MoneyBookEntry.find(filter).sort({
    date: -1,
    createdAt: -1,
  });
  let expense = 0;
  let income = 0;
  for (const e of entries) {
    if (e.type === "expense") expense += Number(e.amount);
    else income += Number(e.amount);
  }
  return new ApiResponse(200, "Money book entries retrieved successfully", {
    month,
    entries: entries.map((e) => e.toJSON()),
    totals: {
      expense: money(expense),
      income: money(income),
      count: entries.length,
    },
  });
};

// GET /api/money-book/reports?month=&months=
export const getMoneyBookReportsService = async (
  query: IMoneyBookReportsQuery,
  byId: string,
) => {
  const month = query.month || dayString().slice(0, 7);
  await materializeRecurringUpTo(month, byId);
  const span = Math.min(24, Math.max(3, Number(query.months) || 6));
  const months: string[] = [];
  let cursor = month;
  for (let i = 0; i < span; i += 1) {
    months.unshift(cursor);
    cursor = prevMonth(cursor);
  }

  const [monthEntries, trendAgg, categories] = await Promise.all([
    MoneyBookEntry.find({ month }).select("type amount category categoryName"),
    MoneyBookEntry.aggregate([
      { $match: { month: { $in: months } } },
      {
        $group: {
          _id: { month: "$month", type: "$type" },
          amount: { $sum: { $toDouble: "$amount" } },
        },
      },
    ]),
    MoneyBookCategory.find().sort({ sortOrder: 1, name: 1 }),
  ]);

  const colorOf = new Map(categories.map((c) => [String(c._id), c.color]));
  const spend = new Map<string, { name: string; amount: number }>();
  const earn = new Map<string, { name: string; amount: number }>();
  for (const e of monthEntries) {
    const key = e.category ? String(e.category) : "";
    const map = e.type === "expense" ? spend : earn;
    const cur = map.get(key) ?? {
      name: e.categoryName || "Uncategorised",
      amount: 0,
    };
    cur.amount += Number(e.amount);
    map.set(key, cur);
  }
  const slices = (map: Map<string, { name: string; amount: number }>) => {
    const total = [...map.values()].reduce((s, v) => s + v.amount, 0);
    return [...map.entries()]
      .map(([id, v]) => ({
        categoryId: id || null,
        name: v.name,
        color: colorOf.get(id) ?? "#6B7280",
        amount: money(v.amount),
        pct: total > 0 ? money((v.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const trendBy = new Map<string, { expense: number; income: number }>(
    months.map((m) => [m, { expense: 0, income: 0 }]),
  );
  for (const row of trendAgg) {
    const t = trendBy.get(row._id.month);
    if (!t) continue;
    if (row._id.type === "expense") t.expense += row.amount;
    else t.income += row.amount;
  }

  return new ApiResponse(200, "Money book reports retrieved successfully", {
    month,
    spendingByCategory: slices(spend),
    incomeByCategory: slices(earn),
    trend: months.map((m) => {
      const t = trendBy.get(m)!;
      return {
        month: m,
        expense: money(t.expense),
        income: money(t.income),
        net: money(t.income - t.expense),
      };
    }),
  });
};

const resolveRefs = async (payload: {
  categoryId?: string;
  accountId?: string;
}) => {
  const [category, account] = await Promise.all([
    payload.categoryId ? MoneyBookCategory.findById(payload.categoryId) : null,
    payload.accountId ? MoneyBookAccount.findById(payload.accountId) : null,
  ]);
  if (payload.categoryId && !category)
    throw new ApiError(404, "Category not found");
  if (payload.accountId && !account)
    throw new ApiError(404, "Account not found");
  return { category, account };
};

// POST /api/money-book/entries
export const createMoneyBookEntryService = async (
  payload: ICreateMoneyBookEntry,
  byId: string,
) => {
  const { category, account } = await resolveRefs(payload);
  const user = await User.findById(byId);
  const entry = await MoneyBookEntry.create({
    type: payload.type,
    date: payload.date,
    month: monthOf(payload.date),
    title: payload.title.trim(),
    amount: String(payload.amount),
    // blank optional figures arrive as null; never store the word "null"
    quantity: payload.quantity || undefined,
    unitPrice: payload.unitPrice ? String(payload.unitPrice) : undefined,
    usdAmount: payload.usdAmount ? String(payload.usdAmount) : undefined,
    category: category?._id,
    categoryName: category?.name ?? "",
    account: account?._id,
    accountName: account?.name ?? "",
    note: payload.note?.trim() || "",
    recurring: !!payload.recurring,
    seeded: false,
    by: byId,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });
  return new ApiResponse(201, `${entry.title} recorded`, entry.toJSON());
};

// PATCH /api/money-book/entries/:id
export const updateMoneyBookEntryService = async (
  id: string,
  payload: IUpdateMoneyBookEntry,
) => {
  const entry = await MoneyBookEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  const { category, account } = await resolveRefs(payload);
  if (payload.type !== undefined) entry.type = payload.type;
  if (payload.date !== undefined) {
    entry.date = payload.date;
    entry.month = monthOf(payload.date);
  }
  if (payload.title !== undefined) entry.title = payload.title.trim();
  if (payload.amount !== undefined) entry.amount = String(payload.amount);
  if (payload.quantity !== undefined)
    entry.quantity = payload.quantity || undefined;
  if (payload.unitPrice !== undefined) {
    entry.unitPrice = payload.unitPrice ? String(payload.unitPrice) : undefined;
  }
  if (payload.usdAmount !== undefined) {
    entry.usdAmount = payload.usdAmount ? String(payload.usdAmount) : undefined;
  }
  if (payload.categoryId !== undefined) {
    entry.category = category ? (category._id as any) : undefined;
    entry.categoryName = category?.name ?? "";
  }
  if (payload.accountId !== undefined) {
    entry.account = account ? (account._id as any) : undefined;
    entry.accountName = account?.name ?? "";
  }
  if (payload.note !== undefined) entry.note = payload.note.trim();
  if (payload.recurring !== undefined) {
    if (payload.recurring && entry.recurringOf) {
      throw new ApiError(
        400,
        "This is a monthly copy; edit the original entry to change the repeat",
      );
    }
    entry.recurring = payload.recurring;
  }
  await entry.save();
  return new ApiResponse(200, `${entry.title} updated`, entry.toJSON());
};

// DELETE /api/money-book/entries/:id
export const deleteMoneyBookEntryService = async (id: string) => {
  const entry = await MoneyBookEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");
  // deleting a template stops future copies; past copies stay
  await entry.deleteOne();
  return new ApiResponse(200, `${entry.title} removed`, undefined);
};

// GET /api/money-book/categories (with accounts, one call for the form)
export const getMoneyBookMetaService = async () => {
  const [categories, accounts] = await Promise.all([
    MoneyBookCategory.find().sort({ sortOrder: 1, name: 1 }),
    MoneyBookAccount.find().sort({ sortOrder: 1, name: 1 }),
  ]);
  return new ApiResponse(200, "Money book categories retrieved successfully", {
    categories: categories.map((c) => c.toJSON()),
    accounts: accounts.map((a) => a.toJSON()),
  });
};

// POST /api/money-book/categories
export const createMoneyBookCategoryService = async (
  payload: ICreateMoneyBookCategory,
) => {
  const name = payload.name.trim();
  const clash = await MoneyBookCategory.findOne({
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (clash) throw new ApiError(409, `"${clash.name}" already exists`);
  const count = await MoneyBookCategory.countDocuments();
  const category = await MoneyBookCategory.create({
    name,
    color: payload.color || "#0FA53A",
    monthlyBudget:
      payload.monthlyBudget === null ? undefined : payload.monthlyBudget,
    sortOrder: count,
  });
  return new ApiResponse(201, `${category.name} added`, category.toJSON());
};

// PATCH /api/money-book/categories/:id
export const updateMoneyBookCategoryService = async (
  id: string,
  payload: Partial<ICreateMoneyBookCategory>,
) => {
  const category = await MoneyBookCategory.findById(id);
  if (!category) throw new ApiError(404, "Category not found");
  if (payload.name !== undefined) {
    const name = payload.name.trim();
    category.name = name;
    // entries carry a snapshot of the name; keep them in step
    await MoneyBookEntry.updateMany(
      { category: category._id },
      { categoryName: name },
    );
  }
  if (payload.color !== undefined) category.color = payload.color;
  if (payload.monthlyBudget !== undefined) {
    category.monthlyBudget =
      payload.monthlyBudget === null ? undefined : payload.monthlyBudget;
  }
  await category.save();
  return new ApiResponse(200, `${category.name} updated`, category.toJSON());
};

// DELETE /api/money-book/categories/:id: entries keep their snapshot
// name but lose the link, so reports show them as uncategorised
export const deleteMoneyBookCategoryService = async (id: string) => {
  const category = await MoneyBookCategory.findById(id);
  if (!category) throw new ApiError(404, "Category not found");
  await MoneyBookEntry.updateMany(
    { category: category._id },
    { $unset: { category: 1 } },
  );
  await category.deleteOne();
  return new ApiResponse(200, `${category.name} removed`, undefined);
};

// POST /api/money-book/accounts
export const createMoneyBookAccountService = async (name: string) => {
  const clean = name.trim();
  const clash = await MoneyBookAccount.findOne({
    name: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (clash) throw new ApiError(409, `"${clash.name}" already exists`);
  const count = await MoneyBookAccount.countDocuments();
  const account = await MoneyBookAccount.create({
    name: clean,
    sortOrder: count,
  });
  return new ApiResponse(201, `${account.name} added`, account.toJSON());
};

// DELETE /api/money-book/accounts/:id
export const deleteMoneyBookAccountService = async (id: string) => {
  const account = await MoneyBookAccount.findById(id);
  if (!account) throw new ApiError(404, "Account not found");
  await MoneyBookEntry.updateMany(
    { account: account._id },
    { $unset: { account: 1 } },
  );
  await account.deleteOne();
  return new ApiResponse(200, `${account.name} removed`, undefined);
};

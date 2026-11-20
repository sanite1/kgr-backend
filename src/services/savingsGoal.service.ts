import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import SavingsGoal from "../models/SavingsGoal";
import SavingsGoalEntry from "../models/SavingsGoalEntry";
import User from "../models/User";
import logger from "../config/logger";
import { runOnce } from "../helpers/runOnce";
import { dayString } from "../helpers/day";
import {
  DAYS_PER_MONTH,
  addMonths,
  daysBetween,
  money,
  monthlyFromDaily,
  monthlyNeeded,
  monthsToReach,
  planBalance,
  planBalanceAt,
} from "../helpers/growth";
import {
  ICreateGoalEntry,
  ICreateSavingsGoal,
  ISavingsGoal,
  ISavingsGoalEntry,
  IUpdateGoalEntry,
  IUpdateSavingsGoal,
} from "../interfaces/savingsGoal.interface";

// One-time migration: managers and admins with customized tab access
// saved before the Goal Tracker existed get the new key exactly once.
const grantOnce = async () => {
  const res = await User.updateMany(
    { role: { $in: ["admin", "manager"] }, access: { $type: "array" } },
    { $addToSet: { access: "goal_tracker" } },
  );
  logger.info(`Goal Tracker access granted to ${res.modifiedCount} user(s)`);
};
runOnce("migration_access_goal_tracker", grantOnce);

const signed = (e: { kind: string; amount: number }) =>
  e.kind === "withdrawal" ? -e.amount : e.amount;

// Where a goal stands today against its own plan. Everything the page
// shows about "ahead or behind" comes from here.
export const summarise = (
  goal: ISavingsGoal,
  entries: ISavingsGoalEntry[],
  today = dayString(),
) => {
  const monthly = monthlyFromDaily(goal.dailyAmount);
  const endDate = addMonths(goal.startDate, goal.months);
  const totalDays = Math.max(1, daysBetween(goal.startDate, endDate));
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, daysBetween(goal.startDate, today)),
  );
  const monthsElapsed = elapsedDays / DAYS_PER_MONTH;
  const monthsLeft = Math.max(0, goal.months - monthsElapsed);
  const daysLeft = totalDays - elapsedDays;

  const upTo = entries.filter((e) => e.date <= today);
  const deposits = upTo
    .filter((e) => e.kind === "deposit")
    .reduce((s, e) => s + e.amount, 0);
  const interest = upTo
    .filter((e) => e.kind === "interest")
    .reduce((s, e) => s + e.amount, 0);
  const withdrawals = upTo
    .filter((e) => e.kind === "withdrawal")
    .reduce((s, e) => s + e.amount, 0);
  const actual = deposits + interest - withdrawals;

  const planToDate = planBalanceAt(
    monthly,
    goal.ratePct,
    monthsElapsed,
    goal.months,
  );
  const gap = actual - planToDate;
  const progressPct =
    goal.targetAmount > 0
      ? Math.min(999, (actual / goal.targetAmount) * 100)
      : 0;

  // what it now takes, per day from today, to still land on target
  const neededMonthly = monthlyNeeded(
    actual,
    goal.targetAmount,
    goal.ratePct,
    monthsLeft,
  );
  const neededDaily = monthsLeft > 0 ? neededMonthly / DAYS_PER_MONTH : 0;

  // at the real pace so far (deposits only, interest assumed as planned)
  const paceDaily = elapsedDays > 0 ? deposits / elapsedDays : 0;
  const paceMonthly = paceDaily * DAYS_PER_MONTH;
  const monthsAtPace = monthsToReach(
    actual,
    paceMonthly,
    goal.ratePct,
    goal.targetAmount,
  );
  const reachDateAtPace =
    monthsAtPace === null ? null : addMonths(today, monthsAtPace);
  const balanceAtEndAtPace = planBalance(
    actual,
    paceMonthly,
    goal.ratePct,
    Math.ceil(monthsLeft),
  );

  const reached = actual >= goal.targetAmount && goal.targetAmount > 0;
  const verdict: "reached" | "ahead" | "on_track" | "behind" | "not_started" =
    reached
      ? "reached"
      : elapsedDays === 0 && actual === 0
        ? "not_started"
        : gap >= 0
          ? gap > planToDate * 0.02
            ? "ahead"
            : "on_track"
          : "behind";

  return {
    today,
    endDate,
    totalDays,
    elapsedDays,
    daysLeft,
    monthsElapsed: Math.round(monthsElapsed * 100) / 100,
    monthsLeft: Math.round(monthsLeft * 100) / 100,
    plannedMonthly: money(monthly),
    deposits: money(deposits),
    interest: money(interest),
    withdrawals: money(withdrawals),
    actual: money(actual),
    planToDate: money(planToDate),
    gap: money(gap),
    progressPct: Math.round(progressPct * 10) / 10,
    neededDaily: money(neededDaily),
    paceDaily: money(paceDaily),
    monthsAtPace,
    reachDateAtPace,
    balanceAtEndAtPace: money(balanceAtEndAtPace),
    verdict,
    entryCount: entries.length,
  };
};

// month-end points from the start to the planned end: the plan line
// all the way, the actual line only up to today
const series = (
  goal: ISavingsGoal,
  entries: ISavingsGoalEntry[],
  today: string,
) => {
  const monthly = monthlyFromDaily(goal.dailyAmount);
  const points: {
    month: number;
    date: string;
    plan: number;
    actual: number | null;
  }[] = [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (let m = 0; m <= goal.months; m += 1) {
    const date = addMonths(goal.startDate, m);
    const plan = planBalance(0, monthly, goal.ratePct, m);
    let actual: number | null = null;
    if (date <= today || m === 0) {
      actual = sorted
        .filter((e) => e.date <= date)
        .reduce((s, e) => s + signed(e), 0);
    }
    points.push({ month: m, date, plan: money(plan), actual });
  }
  // today's point so the actual line ends where the money really is
  if (
    today > goal.startDate &&
    today < addMonths(goal.startDate, goal.months)
  ) {
    const actualNow = sorted
      .filter((e) => e.date <= today)
      .reduce((s, e) => s + signed(e), 0);
    const monthsElapsed = daysBetween(goal.startDate, today) / DAYS_PER_MONTH;
    points.push({
      month: Math.round(monthsElapsed * 100) / 100,
      date: today,
      plan: money(
        planBalanceAt(monthly, goal.ratePct, monthsElapsed, goal.months),
      ),
      actual: money(actualNow),
    });
    points.sort((a, b) => a.month - b.month);
  }
  return points;
};

const targetFor = (daily: number, ratePct: number, months: number) =>
  money(planBalance(0, monthlyFromDaily(daily), ratePct, months));

// GET /api/goals
export const listGoalsService = async () => {
  const goals = await SavingsGoal.find().sort({ status: 1, createdAt: -1 });
  const ids = goals.map((g) => g._id);
  const entries = await SavingsGoalEntry.find({ goal: { $in: ids } }).select(
    "goal date kind amount",
  );
  const byGoal = new Map<string, ISavingsGoalEntry[]>();
  for (const e of entries) {
    const key = String(e.goal);
    byGoal.set(key, [...(byGoal.get(key) ?? []), e]);
  }
  const items = goals.map((g) => ({
    ...g.toJSON(),
    summary: summarise(g, byGoal.get(String(g._id)) ?? []),
  }));
  return new ApiResponse(200, "Goals retrieved successfully", items);
};

// GET /api/goals/:id
export const getGoalService = async (id: string) => {
  const goal = await SavingsGoal.findById(id);
  if (!goal) throw new ApiError(404, "Goal not found");
  const entries = await SavingsGoalEntry.find({ goal: goal._id }).sort({
    date: -1,
    createdAt: -1,
  });
  const today = dayString();
  return new ApiResponse(200, "Goal retrieved successfully", {
    goal: goal.toJSON(),
    summary: summarise(goal, entries, today),
    series: series(goal, entries, today),
    entries: entries.map((e) => e.toJSON()),
  });
};

export const createGoalService = async (
  payload: ICreateSavingsGoal,
  userId: string,
) => {
  const goal = await SavingsGoal.create({
    name: payload.name.trim(),
    dailyAmount: payload.dailyAmount,
    ratePct: payload.ratePct,
    months: payload.months,
    startDate: payload.startDate,
    targetAmount: targetFor(
      payload.dailyAmount,
      payload.ratePct,
      payload.months,
    ),
    account: payload.account?.trim() || "",
    note: payload.note?.trim() || "",
    createdBy: userId,
  });
  return new ApiResponse(201, `${goal.name} created`, goal.toJSON());
};

export const updateGoalService = async (
  id: string,
  payload: IUpdateSavingsGoal,
) => {
  const goal = await SavingsGoal.findById(id);
  if (!goal) throw new ApiError(404, "Goal not found");
  if (payload.name !== undefined) goal.name = payload.name.trim();
  if (payload.dailyAmount !== undefined) goal.dailyAmount = payload.dailyAmount;
  if (payload.ratePct !== undefined) goal.ratePct = payload.ratePct;
  if (payload.months !== undefined) goal.months = payload.months;
  if (payload.startDate !== undefined) goal.startDate = payload.startDate;
  if (payload.account !== undefined) goal.account = payload.account.trim();
  if (payload.note !== undefined) goal.note = payload.note.trim();
  if (payload.status !== undefined) goal.status = payload.status;
  // the plan changed, so the finish line moves with it
  goal.targetAmount = targetFor(goal.dailyAmount, goal.ratePct, goal.months);
  await goal.save();
  return new ApiResponse(200, `${goal.name} updated`, goal.toJSON());
};

export const deleteGoalService = async (id: string) => {
  const goal = await SavingsGoal.findById(id);
  if (!goal) throw new ApiError(404, "Goal not found");
  await SavingsGoalEntry.deleteMany({ goal: goal._id });
  await goal.deleteOne();
  return new ApiResponse(200, `${goal.name} and its entries removed`);
};

const nameOf = async (userId: string) => {
  const user = await User.findById(userId);
  return user ? `${user.firstName} ${user.lastName}`.trim() : "";
};

export const createEntryService = async (
  goalId: string,
  payload: ICreateGoalEntry,
  userId: string,
) => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) throw new ApiError(404, "Goal not found");
  if (payload.date < goal.startDate) {
    throw new ApiError(400, "Entry is dated before the goal started");
  }
  if (payload.date > dayString()) {
    throw new ApiError(400, "Entry cannot be dated in the future");
  }
  const entry = await SavingsGoalEntry.create({
    goal: goal._id,
    date: payload.date,
    kind: payload.kind,
    amount: payload.amount,
    note: payload.note?.trim() || "",
    addedBy: userId,
    addedByName: await nameOf(userId),
  });
  return new ApiResponse(201, `${payload.kind} logged`, entry.toJSON());
};

export const updateEntryService = async (
  goalId: string,
  entryId: string,
  payload: IUpdateGoalEntry,
  userId: string,
) => {
  const entry = await SavingsGoalEntry.findOne({ _id: entryId, goal: goalId });
  if (!entry) throw new ApiError(404, "Entry not found");
  const to = {
    date: payload.date ?? entry.date,
    kind: payload.kind ?? entry.kind,
    amount: payload.amount ?? entry.amount,
    note: payload.note !== undefined ? payload.note.trim() : entry.note,
  };
  if (
    to.date === entry.date &&
    to.kind === entry.kind &&
    to.amount === entry.amount &&
    to.note === entry.note
  ) {
    throw new ApiError(400, "Nothing changed");
  }
  if (to.date > dayString()) {
    throw new ApiError(400, "Entry cannot be dated in the future");
  }
  entry.edits.push({
    at: new Date(),
    by: userId as any,
    byName: await nameOf(userId),
    note: payload.editNote?.trim() || "",
    from: {
      date: entry.date,
      kind: entry.kind,
      amount: entry.amount,
      note: entry.note,
    },
    to,
  });
  entry.date = to.date;
  entry.kind = to.kind;
  entry.amount = to.amount;
  entry.note = to.note;
  await entry.save();
  return new ApiResponse(200, "Entry corrected", entry.toJSON());
};

export const deleteEntryService = async (goalId: string, entryId: string) => {
  const entry = await SavingsGoalEntry.findOneAndDelete({
    _id: entryId,
    goal: goalId,
  });
  if (!entry) throw new ApiError(404, "Entry not found");
  return new ApiResponse(200, "Entry removed");
};

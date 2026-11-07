import { Document, Types } from "mongoose";

// Goal Tracker: a savings target the company is actually working
// towards, with the real money logged against it by hand. The plan
// (daily amount, rate, months) comes from the Growth Planner's sum;
// the entries are what truly happened.

export type GoalStatus = "active" | "reached" | "archived";
export type GoalEntryKind = "deposit" | "interest" | "withdrawal";

export interface ISavingsGoal extends Document {
  name: string;
  dailyAmount: number; // the plan: naira set aside per day
  ratePct: number; // assumed yearly interest
  months: number; // plan length
  startDate: string; // YYYY-MM-DD
  targetAmount: number; // what the plan ends at, frozen at creation/edit
  account: string; // where the money sits, free text
  note: string;
  status: GoalStatus;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGoalEntryEdit {
  at: Date;
  by: Types.ObjectId;
  byName: string;
  note: string;
  from: { date: string; kind: GoalEntryKind; amount: number; note: string };
  to: { date: string; kind: GoalEntryKind; amount: number; note: string };
}

export interface ISavingsGoalEntry extends Document {
  goal: Types.ObjectId;
  date: string; // YYYY-MM-DD
  kind: GoalEntryKind;
  amount: number;
  note: string;
  addedBy: Types.ObjectId;
  addedByName: string;
  edits: IGoalEntryEdit[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateSavingsGoal {
  name: string;
  dailyAmount: number;
  ratePct: number;
  months: number;
  startDate: string;
  account?: string;
  note?: string;
}
export type IUpdateSavingsGoal = Partial<ICreateSavingsGoal> & {
  status?: GoalStatus;
};

export interface ICreateGoalEntry {
  date: string;
  kind: GoalEntryKind;
  amount: number;
  note?: string;
}
export type IUpdateGoalEntry = Partial<ICreateGoalEntry> & {
  editNote?: string;
};

import { Document, Types } from "mongoose";

// Finance: the money behind the operation. Investments and loans are
// typed in by hand; revenue and expenditures come from the console;
// salaries are entered monthly; profit falls out of the formula and a
// slice of it can buy the loan down.

export type FinanceEntryKind =
  "investment" | "loan" | "repayment" | "salary" | "other_debt";

export interface IFinanceEntry extends Document {
  kind: FinanceEntryKind;
  amount: string; // money as a string, like everywhere else
  date: string; // YYYY-MM-DD the money moved
  month: string; // YYYY-MM; salaries and buy-downs belong to a month
  label: string; // investor, lender, what the debt is for
  note: string;
  loan?: Types.ObjectId; // repayment -> the loan it pays down
  fromProfitPercent?: number; // repayment carved out of a month's profit
  by: Types.ObjectId;
  byName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateFinanceEntry {
  kind: FinanceEntryKind;
  amount: number;
  date?: string;
  month?: string;
  label?: string;
  note?: string;
  loanId?: string;
}

export interface IBuyDown {
  month: string; // YYYY-MM
  percent: number; // share of that month's profit
  loanId?: string;
  note?: string;
}

export interface IFinanceEntriesQuery {
  page?: number;
  pageSize?: number;
  kind?: string;
}

export interface IMonthBreakdown {
  month: string;
  revenue: number;
  expenses: number;
  salary: number;
  profit: number;
  buyDown: number;
  kept: number;
}

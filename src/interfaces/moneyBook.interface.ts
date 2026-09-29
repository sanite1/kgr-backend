import { Document, Types } from "mongoose";

// Money Book: the money manager the team asked for. Every naira spent
// on purchases (mostly online consumables) written in by the team
// themselves, in categories they own, with budgets, reports and
// recurring entries.

export type MoneyBookType = "expense" | "income";

export interface IMoneyBookCategory extends Document {
  name: string;
  color: string; // hex
  monthlyBudget?: number; // naira; undefined = no budget set
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMoneyBookAccount extends Document {
  name: string;
  sortOrder: number;
}

export interface IMoneyBookEntry extends Document {
  type: MoneyBookType;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  title: string; // the item
  amount: string; // naira, money as a string
  quantity?: number;
  unitPrice?: string; // naira
  usdAmount?: string; // when bought abroad, the dollar figure as written
  category?: Types.ObjectId;
  categoryName: string; // snapshot
  account?: Types.ObjectId;
  accountName: string; // snapshot
  note: string;
  // recurring: the template repeats monthly; copies point back to it
  recurring: boolean;
  recurringOf?: Types.ObjectId;
  seeded: boolean; // came from the handwritten sheets
  by: Types.ObjectId;
  byName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateMoneyBookEntry {
  type: MoneyBookType;
  date: string;
  title: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  usdAmount?: number;
  categoryId?: string;
  accountId?: string;
  note?: string;
  recurring?: boolean;
}

export type IUpdateMoneyBookEntry = Partial<ICreateMoneyBookEntry>;

export interface IMoneyBookEntriesQuery {
  month?: string; // YYYY-MM
  search?: string;
  categoryId?: string;
  accountId?: string;
  type?: MoneyBookType;
}

export interface IMoneyBookReportsQuery {
  month?: string; // the category breakdown month (default this month)
  months?: number; // trend length, default 6
}

export interface ICreateMoneyBookCategory {
  name: string;
  color?: string;
  monthlyBudget?: number | null;
}

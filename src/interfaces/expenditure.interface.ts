import { Document, Types } from "mongoose";

// A spending category ("folder"): Tyres, Consumables, Sprockets,
// Logistics, Labour, etc. Managed by admins; entries snapshot the name.
export interface IExpenditureCategory extends Document {
  name: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// One line of money spent on a given day, filed under a category and
// optionally attributed to a bus.
export interface IExpenditure extends Document {
  expenditureId: number; // human-facing sequence
  date: string; // Lagos business day, YYYY-MM-DD
  amount: string; // money as string
  category: Types.ObjectId;
  categoryName: string; // snapshot survives renames
  bus?: Types.ObjectId; // absent for overhead (Carpenter, Logistics...)
  busNumber?: string; // snapshot
  description: string; // what/who: "Tyres for A9", "Carpenter"
  note: string;
  recordedBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// DTOs
export interface ICreateExpenditureCategory {
  name: string;
}
export interface IUpdateExpenditureCategory {
  name?: string;
  isActive?: boolean;
}

export interface ICreateExpenditure {
  date?: string; // defaults to today (Lagos)
  amount: string;
  categoryId?: string; // existing category
  categoryName?: string; // or a new name to find-or-create
  busId?: string;
  description: string;
  note?: string;
}

export interface IUpdateExpenditure {
  date?: string;
  amount?: string;
  categoryId?: string;
  busId?: string | null; // null clears the bus
  description?: string;
  note?: string;
}

export interface IExpendituresQuery {
  page?: number;
  pageSize?: number;
  busId?: string;
  categoryId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  search?: string;
}

export interface IExpenditureSummaryQuery {
  from?: string;
  to?: string;
  busId?: string;
  categoryId?: string;
  search?: string;
}

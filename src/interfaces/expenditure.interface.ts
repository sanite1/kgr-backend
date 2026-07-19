import { Document, Types } from "mongoose";

// manual = keyed in by hand; the others are auto-generated when stock
// leaves inventory and stay in sync with their source.
export type ExpenditureSource = "manual" | "part_request" | "repair";

// completed = money definitively spent; pending = committed but the
// source (an open repair) is not final; cancelled = reversed (parts
// returned) and excluded from totals.
export type ExpenditureStatus = "completed" | "pending" | "cancelled";

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
  source: ExpenditureSource;
  sourceRef?: Types.ObjectId; // the request/repair that generated it
  status: ExpenditureStatus;
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
  status?: string;
  source?: string;
}

export interface IExpenditureSummaryQuery {
  from?: string;
  to?: string;
  busId?: string;
  categoryId?: string;
  search?: string;
  status?: string;
  source?: string;
}

// Payload the request/repair services hand to the expenditure sync.
export interface ISourceExpenditure {
  source: Exclude<ExpenditureSource, "manual">;
  sourceRef: string;
  status: ExpenditureStatus;
  amount: string;
  categoryName: string; // system folder, find-or-create
  description: string;
  busId?: string;
  busNumber?: string;
  recordedBy: string;
}

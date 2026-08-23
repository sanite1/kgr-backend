import { Document, Types } from "mongoose";

// the daily gate tally: every bus cleared before going out, morning and
// evening, kept twice - once by security, once by admin - so the two
// counts can be compared
export type ChecklistKind = "security" | "admin";
export type ChecklistSession = "morning" | "evening";

export interface IChecklistEntry extends Document {
  date: string; // Lagos business day
  kind: ChecklistKind;
  busName: string; // typed, uppercase
  session: ChecklistSession;
  batteryName: string; // typed, uppercase
  trips: number; // 1 | 1.5 | 2 | 3
  addedBy: Types.ObjectId;
  addedByName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateChecklistEntry {
  kind: ChecklistKind;
  busName: string;
  session: ChecklistSession;
  batteryName: string;
  trips: number;
}

export interface IChecklistQuery {
  kind: ChecklistKind;
  date?: string; // defaults to today
}

export interface IChecklistDaysQuery {
  page?: number;
  pageSize?: number;
}

export interface IChecklistCompareQuery {
  date?: string; // defaults to today
}

// one side of a compared row: what one list wrote for a bus and session
export interface ICompareSide {
  batteryName: string;
  trips: number;
  addedByName: string;
  createdAt: Date | undefined;
}

// green: both lists agree; red: both wrote it but differently;
// yellow: only one list has it
export type CompareStatus =
  "match" | "mismatch" | "security_only" | "staff_only";

// The checklist against the receipts: per bus per day, the receipt is
// the money record and both checklists are the eyes at the gate.
export type ReceiptsCompareStatus =
  | "match"
  | "underpaid" // checklist logged more trips than were paid for
  | "no_receipt" // on a checklist, but the bus never got a ticket
  | "not_on_checklist" // ticketed, but nobody logged it at the gate
  | "battery_differs" // checklist battery is not the receipt's (no swap)
  | "fewer_trips"; // checklist logged fewer trips than were paid for

export interface IReceiptsCompareSide {
  batteries: string[]; // as typed, one per session
  trips: number; // summed over the sessions logged
  sessions: string[];
  addedByNames: string[];
  batteryOk: boolean;
  tripsVerdict: "ok" | "more" | "fewer";
}

export interface IReceiptsCompareReceipt {
  bills: { billId: number; batteryName: string; trips: number }[];
  batteries: string[];
  trips: number;
}

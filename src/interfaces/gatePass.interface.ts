import { Document, Types } from "mongoose";
import { GatePassStatus } from "./helper.interface";

// security's verdict on one item, given at the gate against the pass
// itself: cleared means what they see matches the line; flagged means
// more, less or different, and the item is NOT allowed out
export interface IItemClearance {
  status: "cleared" | "flagged";
  seenQuantity?: number; // what security actually counted
  note?: string;
  byName?: string; // snapshot of the security person
  at?: Date;
}

// one line on the exit form: what is leaving, how much, why, where to
export interface IGatePassItem {
  description: string;
  quantity: number;
  purpose: string;
  location: string;
  clearance?: IItemClearance; // absent until security checks it
}

export interface IGatePass extends Document {
  passId: number; // human reference, sequential
  date: string; // Lagos business day it was raised
  requestedBy: Types.ObjectId;
  requestedByName: string; // snapshot
  department: string;
  designation: string;
  items: IGatePassItem[];
  exitAt: string; // planned date and time of exit, as written
  status: GatePassStatus;
  decidedBy?: Types.ObjectId;
  decidedByName?: string;
  decidedAt?: Date;
  decisionNote?: string;
  carriedOutBy?: Types.ObjectId;
  carriedOutByName?: string;
  carriedOutAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateGatePass {
  department: string;
  designation?: string;
  exitAt: string;
  items: {
    description: string;
    quantity: number;
    purpose: string;
    location?: string;
  }[];
}

export interface IDecideGatePass {
  note?: string;
}

export interface IClearGatePassItem {
  outcome: "cleared" | "flagged";
  seenQuantity?: number;
  note?: string;
}

export interface IGatePassesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

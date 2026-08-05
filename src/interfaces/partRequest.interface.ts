import { Document, Types } from "mongoose";
import { RequestStatus } from "./helper.interface";

export interface IPartRequest extends Document {
  requestId: number; // human-facing sequence
  bus: Types.ObjectId;
  busNumber: string; // snapshot
  item: Types.ObjectId;
  itemName: string; // snapshot
  quantity: number;
  unitCost: string; // snapshot at request time
  amount: string; // quantity x unitCost
  narration: string;
  nextRequestDate?: string; // YYYY-MM-DD; blocks re-requests until then
  status: RequestStatus;
  requestedBy: Types.ObjectId;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  decisionNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePartRequest {
  busId?: string; // a registered bus...
  target?: string; // ...or anything typed: generator, office, workshop
  itemId: string;
  quantity: number;
  narration?: string;
  nextRequestDate?: string;
  allowOverride?: boolean; // resend after a next-request-date warning
}

export interface IDecideRequest {
  note?: string;
}

export interface IPartRequestsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  busId?: string;
  search?: string;
}

export interface IBusExpenseQuery {
  from?: string;
  to?: string;
}

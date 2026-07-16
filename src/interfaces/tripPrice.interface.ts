import { Document, Types } from "mongoose";

export interface ITripPrice extends Document {
  amount: string; // money stored as strings, never floats
  effectiveFrom: Date;
  setBy: Types.ObjectId;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISetTripPriceRequest {
  amount: string;
  effectiveFrom?: string; // ISO date; omitted = effective immediately
  note?: string;
}

export interface ITripPriceHistoryQuery {
  page?: number;
  pageSize?: number;
}

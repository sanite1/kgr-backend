import { Document, Types } from "mongoose";

// an order bought abroad, tracked until it is in our hands
export type PurchaseStatus = "purchased" | "shipping" | "arrived" | "delivered";

export interface IPurchaseStatusEvent {
  status: PurchaseStatus;
  at: Date;
  by: Types.ObjectId;
  byName: string;
  note: string;
}

export interface IPurchaseOrder extends Document {
  orderId: number; // human reference, sequential
  title: string; // what was bought, e.g. "40 BMS boards"
  supplier: string; // who we bought from
  quantity?: number;
  trackingNumber: string;
  expectedArrival: string; // YYYY-MM-DD, "" when unknown
  notes: string;
  status: PurchaseStatus;
  history: IPurchaseStatusEvent[];
  createdBy: Types.ObjectId;
  createdByName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePurchase {
  title: string;
  supplier?: string;
  quantity?: number;
  trackingNumber?: string;
  expectedArrival?: string;
  notes?: string;
}

export interface IUpdatePurchase {
  trackingNumber?: string;
  expectedArrival?: string;
  notes?: string;
}

export interface ISetPurchaseStatus {
  status: PurchaseStatus;
  note?: string;
}

export interface IPurchasesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

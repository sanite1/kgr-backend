import { Document, Types } from "mongoose";
import { ReceiptStatus } from "./helper.interface";

export interface IReceipt extends Document {
  billId: number; // global sequence, human-facing
  ticketId: string; // random 8-digit code staff read aloud / QR-verify
  bus: Types.ObjectId;
  busNumber: string; // snapshot so history survives renames
  batteryName: string; // battery on the bus at issuance, e.g. "KAMILA 9"
  batteryPercent: number; // charge level read off the pack
  voltage: number; // pack voltage, 0 when not recorded
  timeOut: string; // departure time, HH:MM (Lagos)
  expectedTrips: number;
  unitPrice: string; // trip price snapshot at issuance
  expectedAmount: string; // expectedTrips x unitPrice
  date: string; // Lagos business day, YYYY-MM-DD
  status: ReceiptStatus;
  issuedBy: Types.ObjectId;
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  amountPaid?: string; // below expectedAmount = short payment
  payReason?: string;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  voidReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateReceiptRequest {
  busId: string;
  batteryName: string;
  batteryPercent: number;
  voltage?: number;
  timeOut: string; // HH:MM
  expectedTrips: number;
  checkIn?: boolean;
  // a bus normally gets one receipt per day; the frontend re-sends with
  // this flag after the user confirms an intentional duplicate
  allowDuplicate?: boolean;
}

export interface IReceiptsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  busId?: string;
  date?: string;
  search?: string; // bill id or ticket id
  sort?: string; // newest (default) | oldest, for arrears views
}

export interface IVoidReceiptRequest {
  reason: string;
}

export interface IReceiptSummaryQuery {
  date?: string;
}

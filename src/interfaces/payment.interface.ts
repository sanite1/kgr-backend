import { Document, Types } from "mongoose";

export interface IPayment extends Document {
  receipt: Types.ObjectId;
  amount: string; // money as strings
  method: "cash"; // transfers/POS can join the union later
  collectedBy: Types.ObjectId;
  date: string; // Lagos day the cash was collected
  receiptDate: string; // the receipt's own day; differs when arrears are paid
  reason: string; // why the amount differs from the expected amount
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayReceiptRequest {
  receiptId: string;
  amount?: string; // omitted = pay in full
  reason?: string; // required when amount is below the expected amount
}

export interface IPaymentsQuery {
  page?: number;
  pageSize?: number;
  date?: string;
  collectedBy?: string; // user id, or "me"
}

export interface IDailyAccountQuery {
  date?: string;
  page?: number;
  pageSize?: number;
}

export interface IExportPaymentsQuery {
  date?: string;
  collectedBy?: string;
}

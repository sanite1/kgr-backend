import { Document, Types } from "mongoose";

export interface IPayment extends Document {
  receipt: Types.ObjectId;
  amount: string; // money as strings
  method: "cash"; // transfers/POS can join the union later
  collectedBy: Types.ObjectId;
  date: string; // Lagos day the cash was collected
  receiptDate: string; // the receipt's own day; differs when arrears are paid
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayReceiptRequest {
  receiptId: string;
}

export interface IPaymentsQuery {
  page?: number;
  pageSize?: number;
  date?: string;
  collectedBy?: string; // user id, or "me"
}

export interface IDailyAccountQuery {
  date?: string;
}

export interface IExportPaymentsQuery {
  date?: string;
  collectedBy?: string;
}

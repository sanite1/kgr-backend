import { Document, Types } from "mongoose";
import { BatteryLocation, ExitCheck } from "./helper.interface";

// one battery's line on a submitted form; carries snapshots so the record
// still reads correctly even if the pack is renamed or removed later
export interface IExitFormRow {
  battery: Types.ObjectId;
  code: string;
  series: string; // SUB, JAFAR, MUH'D, KAM, KAMILA...
  check: ExitCheck;
  location: BatteryLocation;
  note: string;
}

export interface IExitFormTotals {
  active: number;
  faulty: number;
  needsCheck: number;
  outOfUse: number;
  sold: number;
  bms: number;
}

export interface IBatteryExitForm extends Document {
  formId: number; // human reference, sequential
  date: string; // Lagos business day, YYYY-MM-DD
  issuedBy: Types.ObjectId;
  issuedByName: string; // snapshot
  rows: IExitFormRow[];
  totals: IExitFormTotals;
  byLocation: Map<string, number>;
  comments: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExitFormRowInput {
  batteryId: string;
  check: ExitCheck;
  location: BatteryLocation;
  note?: string;
}

export interface ICreateExitForm {
  date?: string;
  rows: IExitFormRowInput[];
  comments?: string;
}

export interface IExitFormsQuery {
  page?: number;
  pageSize?: number;
  date?: string;
  search?: string;
}

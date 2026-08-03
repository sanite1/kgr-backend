import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// Identical closing sheets kept by different people at different
// places. Same format, separate lists that never mix.
export type ClosingSheetKey = "main" | "muhd_kamila" | "main_yard" | "ubs";

// one battery on the evening closing sheet
export interface IBatteryClosingEntry extends Document {
  date: string; // Lagos business day, YYYY-MM-DD
  sheet: ClosingSheetKey;
  batteryName: string; // typed, uppercase
  percent: 50 | 75 | 100;
  voltage: string; // typed as read off the meter
  location: BatteryLocation;
  trips: number; // trips this pack did today
  tripsAuto: boolean; // true when derived from receipts and swaps
  worked: boolean; // the pack actually went out after being prepared
  workedAt?: Date;
  workedNote?: string; // "Receipt #123 on A 37" or "Marked by NAME"
  addedBy: Types.ObjectId;
  addedByName: string; // snapshot
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateClosingEntry {
  batteryName: string;
  percent: 50 | 75 | 100;
  voltage: string;
  location: BatteryLocation;
  trips?: number; // omitted = derive from today's receipts and swaps
}

export interface IClosingEntriesQuery {
  date?: string; // defaults to today
}

export interface IClosingDaysQuery {
  page?: number;
  pageSize?: number;
}

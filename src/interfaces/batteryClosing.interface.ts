import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// one battery on the evening closing sheet
export interface IBatteryClosingEntry extends Document {
  date: string; // Lagos business day, YYYY-MM-DD
  batteryName: string; // typed, uppercase
  percent: 50 | 75 | 100;
  voltage: string; // typed as read off the meter
  location: BatteryLocation;
  trips: number; // trips this pack did today
  tripsAuto: boolean; // true when derived from receipts and swaps
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

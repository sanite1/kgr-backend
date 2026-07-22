import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// one battery on the evening closing sheet
export interface IBatteryClosingEntry extends Document {
  date: string; // Lagos business day, YYYY-MM-DD
  batteryName: string; // typed, uppercase
  percent: 50 | 75 | 100;
  voltage: string; // typed as read off the meter
  location: BatteryLocation;
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
}

export interface IClosingEntriesQuery {
  date?: string; // defaults to today
}

export interface IClosingDaysQuery {
  page?: number;
  pageSize?: number;
}

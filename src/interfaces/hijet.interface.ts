import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// The Hijet log: the three errand vehicles are electric too, and their
// drivers used to grab any battery with no record. One entry per pickup
// closes that blind spot; entries also count as sightings and as work.

export type HijetTimeOfDay = "morning" | "afternoon" | "night";

export interface IHijetEntry extends Document {
  date: string; // YYYY-MM-DD, stamped at creation
  vehicleName: string; // one of the known hijets, or typed
  batteryName: string; // typed, canon-matched everywhere
  timeOfDay?: HijetTimeOfDay;
  fromLocation?: BatteryLocation; // where the battery was carried from
  trips?: number; // 1 | 1.5 | 2 | 2.5 | 3
  note: string;
  by: Types.ObjectId;
  byName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateHijetEntry {
  vehicleName: string;
  batteryName: string;
  timeOfDay?: HijetTimeOfDay;
  fromLocation?: BatteryLocation;
  trips?: number;
  note?: string;
}

export interface IHijetEntriesQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  date?: string;
}

import { Document, Types } from "mongoose";

export type TrackerHealth = "ok" | "no_power" | "no_data";

export interface IBus extends Document {
  number: string; // normalized "A 37" format
  driverName?: string;
  driverPhone?: string;
  isActive: boolean;
  hasTracker: boolean; // GPS tracker fitted
  trackerHealth: TrackerHealth; // no_power = the 12V feed is dead
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId; // last editor
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateBusRequest {
  number: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
}

export interface IUpdateBusRequest {
  number?: string;
  driverName?: string;
  driverPhone?: string;
  isActive?: boolean;
  hasTracker?: boolean;
  trackerHealth?: TrackerHealth;
  notes?: string;
}

export interface IBusesQuery {
  page?: number;
  pageSize?: number;
  isActive?: string;
  search?: string;
}

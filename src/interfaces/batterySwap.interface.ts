import { Document, Types } from "mongoose";

// one battery swap on a bus: the pack that came off, the pack that went
// on, and how many extra trips the fresh pack is expected to add
export interface IBatterySwap extends Document {
  swapId: number;
  date: string; // Lagos business day
  bus: Types.ObjectId;
  busNumber: string; // snapshot
  initialBattery: Types.ObjectId;
  initialBatteryCode: string; // snapshot
  suppliedBattery: Types.ObjectId;
  suppliedBatteryCode: string; // snapshot
  tripsAdded: number;
  note: string;
  by: Types.ObjectId;
  byName: string; // snapshot
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateBatterySwap {
  busId: string;
  initialBatteryId: string;
  suppliedBatteryId: string;
  tripsAdded: number;
  note?: string;
}

export interface IBatterySwapsQuery {
  page?: number;
  pageSize?: number;
  date?: string;
  busId?: string;
  search?: string;
}

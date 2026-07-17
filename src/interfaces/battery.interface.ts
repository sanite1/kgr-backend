import { Document, Types } from "mongoose";
import { BatteryStatus, BatteryMoveAction } from "./helper.interface";

export interface IBattery extends Document {
  code: string; // physical label on the pack, unique
  status: BatteryStatus;
  bus?: Types.ObjectId; // set only while on_bus
  busNumber?: string; // snapshot
  notes: string;
  isActive: boolean; // false = retired/written off
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBatteryMovement extends Document {
  battery: Types.ObjectId;
  batteryCode: string; // snapshot
  action: BatteryMoveAction;
  fromStatus: BatteryStatus;
  toStatus: BatteryStatus;
  bus?: Types.ObjectId; // the bus involved in issue/collect
  busNumber?: string;
  note: string;
  by: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateBattery {
  code: string;
  status?: Exclude<BatteryStatus, "on_bus">; // registering straight onto a bus is not allowed
  notes?: string;
}

export interface IUpdateBattery {
  code?: string;
  notes?: string;
  isActive?: boolean;
}

export interface IIssueBattery {
  busId: string;
  note?: string;
}

export interface ICollectBattery {
  to: Exclude<BatteryStatus, "on_bus" | "in_repair">; // in_store | charging | faulty
  note?: string;
}

export interface ISetBatteryStatus {
  to: Exclude<BatteryStatus, "on_bus">; // on/off a bus goes through issue/collect
  note?: string;
}

export interface IBatteriesQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  busId?: string;
  isActive?: string;
  search?: string;
}

export interface IBatteryMovementsQuery {
  page?: number;
  pageSize?: number;
}

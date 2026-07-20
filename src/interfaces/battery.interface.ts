import { Document, Types } from "mongoose";
import { BatteryStatus, BatteryMoveAction } from "./helper.interface";

export interface IBattery extends Document {
  code: string; // physical label on the pack, unique
  status: BatteryStatus;
  bus?: Types.ObjectId; // set while assigned to a bus (independent of status)
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
  status?: BatteryStatus;
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
  note?: string; // collecting only clears the bus; status is managed separately
}

export interface ISetBatteryStatus {
  to: BatteryStatus;
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

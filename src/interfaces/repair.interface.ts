import { Document, Types } from "mongoose";
import { RepairStatus } from "./helper.interface";

export interface IRepairPartLine {
  item: Types.ObjectId;
  itemName: string; // snapshot
  unit: string; // snapshot
  quantity: number;
  unitCost: string; // snapshot at time of use
  amount: string; // quantity x unitCost
}

export interface IRepairJob extends Document {
  jobId: number; // human-facing sequence
  title: string;
  description: string;
  bus?: Types.ObjectId; // at least one of bus/battery is set
  busNumber?: string; // snapshot
  battery?: Types.ObjectId;
  batteryCode?: string; // snapshot
  parts: IRepairPartLine[];
  partsCost: string; // sum of line amounts
  laborCost: string;
  totalCost: string; // partsCost + laborCost
  status: RepairStatus;
  openedBy: Types.ObjectId;
  closedBy?: Types.ObjectId;
  closedAt?: Date;
  closeNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRepairPartInput {
  itemId: string;
  quantity: number;
}

export interface ICreateRepairJob {
  title: string;
  description?: string;
  busId?: string;
  batteryId?: string;
  parts?: IRepairPartInput[];
}

export interface ICompleteRepairJob {
  laborCost?: string;
  note?: string;
}

export interface ICancelRepairJob {
  note?: string;
}

export interface IRepairJobsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  busId?: string;
  search?: string;
}

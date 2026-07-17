import { Document, Types } from "mongoose";

export interface IBus extends Document {
  number: string; // normalized "A 37" format
  driverName?: string;
  driverPhone?: string;
  isActive: boolean;
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
  notes?: string;
}

export interface IBusesQuery {
  page?: number;
  pageSize?: number;
  isActive?: string;
  search?: string;
}

import { Document, Types } from "mongoose";
import { ConversionStatus } from "./helper.interface";

// One answered field from the technical sheet, kept as label/value so
// the backend never chases the website's field list.
export interface IConversionField {
  label: string;
  value: string;
}

export interface IConversionSection {
  title: string;
  fields: IConversionField[];
}

export interface IConversionRequest extends Document {
  requestId: number; // human-facing sequence
  name: string;
  email: string;
  phone: string;
  remarks: string;
  sections: IConversionSection[];
  status: ConversionStatus;
  handledBy?: Types.ObjectId;
  handledAt?: Date;
  adminNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubmitConversionRequest {
  name: string;
  email: string;
  phone?: string;
  remarks?: string;
  sections?: { title: string; fields: { label: string; value: string }[] }[];
}

export interface IUpdateConversionStatus {
  status: ConversionStatus;
  note?: string;
}

export interface IConversionsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

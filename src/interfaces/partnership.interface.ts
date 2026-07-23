import { Document, Types } from "mongoose";
import { ConversionStatus } from "./helper.interface";

export type PartnershipKind = "corporate" | "individual";

// One answered field from the website form, kept as label/value so the
// backend never chases the website's field list.
export interface IPartnershipField {
  label: string;
  value: string;
}

export interface IPartnershipSection {
  title: string;
  fields: IPartnershipField[];
}

export interface IPartnershipRequest extends Document {
  requestId: number; // human-facing sequence
  kind: PartnershipKind;
  name: string; // company name or full name
  email: string;
  phone: string;
  sections: IPartnershipSection[];
  status: ConversionStatus; // same lead workflow as conversions
  handledBy?: Types.ObjectId;
  handledAt?: Date;
  adminNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubmitPartnershipRequest {
  kind: PartnershipKind;
  name: string;
  email: string;
  phone?: string;
  sections?: { title: string; fields: { label: string; value: string }[] }[];
}

export interface IUpdatePartnershipStatus {
  status: ConversionStatus;
  note?: string;
}

export interface IPartnershipsQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  kind?: string;
  search?: string;
}

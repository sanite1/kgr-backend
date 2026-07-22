import { Document, Types } from "mongoose";

export interface ITrackerRow {
  bus?: Types.ObjectId; // matched fleet bus; absent if unrecognized
  busNumber: string; // as reported, normalized
  status: string; // "active" etc, as reported
  startTime: string; // HH:MM:SS
  endTime: string;
  mileageKm: number;
  note: string;
}

// the derived tracker summary, mirroring the operator's daily message
export interface ITrackerSummary {
  totalDevices: number; // active fleet buses with a tracker
  activeCount: number; // buses that appeared in the report
  notActiveTracked: string[]; // tracked + healthy but no movement
  noTracker: string[]; // fleet buses without a tracker
  badTracker: string[]; // tracker present but no 12V / no data
  totalMileageKm: number;
}

export interface ITrackerReport extends Document {
  reportId: number;
  date: string; // the day the movement happened (YYYY-MM-DD)
  rows: ITrackerRow[];
  summary: ITrackerSummary;
  submittedBy: Types.ObjectId;
  submittedByName: string;
  rawText: string; // original pasted message, kept for audit
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrackerRowInput {
  busId?: string;
  busNumber: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  mileageKm: number;
  note?: string;
}

export interface ICreateTrackerReport {
  date: string;
  rows: ITrackerRowInput[];
  rawText?: string;
  notes?: string;
  replace?: boolean; // overwrite an existing report for the same day
}

export interface ITrackerReportsQuery {
  page?: number;
  pageSize?: number;
  date?: string;
}

export interface IMileageQuery {
  month?: string; // YYYY-MM, defaults to the current month
}

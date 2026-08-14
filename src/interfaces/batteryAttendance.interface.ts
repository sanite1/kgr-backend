import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// Attendance is a submitted form, like the battery exit form: one user
// walks the fleet, marks each pack, and saves the whole thing as one
// numbered log. Many users may each submit their own log per day, and
// the admin compares all of a date's logs side by side.

export type AttendanceStatus = "seen" | "missing";
export type AttendanceTimeOfDay = "morning" | "afternoon" | "night";

export interface IAttendanceLogRow {
  battery: Types.ObjectId;
  batteryCode: string; // snapshot
  status: AttendanceStatus;
  timeOfDay: AttendanceTimeOfDay; // when the user says they saw it
  location?: BatteryLocation; // where, when seen
  onBus?: string; // the bus, when auto-marked from a sighting
  auto?: boolean; // filled in by the system, not the submitter
  // where the system's evidence came from, and how fresh it is
  autoSource?:
    "today_sighting" | "last_sighting" | "battery_status" | "prev_attendance";
  asOf?: string; // YYYY-MM-DD the evidence dates from
  note?: string; // battery_status rows: the status value
  lastSeen?: string; // free note, when missing
}

export interface IAttendanceTotals {
  fleet: number;
  seen: number;
  missing: number;
  unmarked: number;
  auto?: number; // of the seen, how many the system filled in
}

export interface IBatteryAttendanceLog extends Document {
  logId: number; // human-friendly #21
  date: string; // YYYY-MM-DD, stamped at submission
  rows: IAttendanceLogRow[]; // unmarked packs are simply absent
  totals: IAttendanceTotals;
  submittedBy: Types.ObjectId;
  submittedByName: string; // snapshot
  submittedByRole: string; // snapshot
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateAttendanceLogRow {
  batteryId: string;
  status: AttendanceStatus;
  timeOfDay: AttendanceTimeOfDay;
  location?: BatteryLocation;
  lastSeen?: string;
}

export interface ICreateAttendanceLog {
  rows: ICreateAttendanceLogRow[];
}

export interface IAttendanceLogsQuery {
  page?: number;
  pageSize?: number;
}

export interface IAttendanceCompareQuery {
  date?: string;
}

import { Document, Types } from "mongoose";
import { BatteryLocation } from "./helper.interface";

// The paper "Battery Attendance" sheet: three times a day the whole
// registered fleet is called, and every pack is either SEEN somewhere
// or MISSING with where it was last seen. Absence is the whole point:
// rolling the register means an unsighted pack cannot hide.
export type AttendanceSession = "morning" | "afternoon" | "night";
export type AttendanceStatus = "seen" | "missing";

export interface IBatteryAttendanceEntry extends Document {
  date: string; // Lagos business day
  session: AttendanceSession;
  battery: Types.ObjectId;
  batteryCode: string; // snapshot
  status: AttendanceStatus;
  location?: BatteryLocation; // where it was seen
  lastSeen: string; // free text when missing: "UBS yesterday evening"
  markedBy: Types.ObjectId;
  markedByName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMarkAttendance {
  batteryId: string;
  session: AttendanceSession;
  status: AttendanceStatus;
  location?: BatteryLocation;
  lastSeen?: string;
}

export interface IAttendanceQuery {
  session: AttendanceSession;
  date?: string; // defaults to today
}

export interface IAttendanceDaysQuery {
  page?: number;
  pageSize?: number;
}

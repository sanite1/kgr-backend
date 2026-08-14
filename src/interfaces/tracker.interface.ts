import { Document, Types } from "mongoose";

// The tracker board: one row per GPS tracker, updated by hand whenever
// somebody reads the tracking platform. Every update is kept as history;
// the tracker document carries the latest snapshot for the table.

export type TrackerStatus = "online" | "offline" | "parked";

export interface ITracker extends Document {
  busName: string; // the bus the tracker rides on (registered or typed)
  bus?: Types.ObjectId; // set when picked from the bus list
  status: TrackerStatus;
  lastSeenText: string; // "10 hrs ago", "2 days" as read off the platform
  location: string; // where the bus is, free text
  purpose: string; // why it is flagged, free text
  note: string;
  lastUpdateAt?: Date;
  lastUpdateByName: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrackerUpdateEntry extends Document {
  tracker: Types.ObjectId;
  busName: string; // snapshot
  status: TrackerStatus;
  lastSeenText: string;
  location: string;
  purpose: string;
  note: string;
  by: Types.ObjectId;
  byName: string;
  createdAt?: Date;
}

export interface ICreateTracker {
  busId?: string; // picked from the bus list
  busName?: string; // or typed free-hand
}

export interface IUpdateTracker {
  status: TrackerStatus;
  lastSeenText: string;
  location: string;
  purpose?: string;
  note?: string;
}

export interface ITrackersQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface ITrackerUpdatesQuery {
  page?: number;
  pageSize?: number;
}

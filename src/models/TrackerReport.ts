import { Schema, model } from "mongoose";
import { ITrackerReport } from "../interfaces/trackerReport.interface";

const rowSchema = new Schema(
  {
    bus: { type: Schema.Types.ObjectId, ref: "Bus" },
    busNumber: { type: String, required: true },
    status: { type: String, default: "active" },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    mileageKm: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const summarySchema = new Schema(
  {
    totalDevices: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
    notActiveTracked: { type: [String], default: [] },
    noTracker: { type: [String], default: [] },
    badTracker: { type: [String], default: [] },
    totalMileageKm: { type: Number, default: 0 },
  },
  { _id: false },
);

const trackerReportSchema = new Schema<ITrackerReport>(
  {
    reportId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, unique: true, index: true },
    rows: { type: [rowSchema], default: [] },
    summary: { type: summarySchema, default: () => ({}) },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, default: "" },
    rawText: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

trackerReportSchema.index({ createdAt: -1 });

const TrackerReport = model<ITrackerReport>(
  "TrackerReport",
  trackerReportSchema,
);
export default TrackerReport;

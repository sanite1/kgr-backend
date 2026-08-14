import { Schema, model } from "mongoose";
import { ITrackerUpdateEntry } from "../interfaces/tracker.interface";

const trackerUpdateEntrySchema = new Schema<ITrackerUpdateEntry>(
  {
    tracker: {
      type: Schema.Types.ObjectId,
      ref: "Tracker",
      required: true,
      index: true,
    },
    busName: { type: String, required: true },
    status: {
      type: String,
      enum: ["online", "offline", "parked"],
      required: true,
    },
    lastSeenText: { type: String, default: "" },
    location: { type: String, default: "" },
    purpose: { type: String, default: "" },
    note: { type: String, default: "" },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, default: "" },
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

const TrackerUpdateEntry = model<ITrackerUpdateEntry>(
  "TrackerUpdateEntry",
  trackerUpdateEntrySchema,
);
export default TrackerUpdateEntry;

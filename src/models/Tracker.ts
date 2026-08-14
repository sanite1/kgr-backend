import { Schema, model } from "mongoose";
import { ITracker } from "../interfaces/tracker.interface";

const trackerSchema = new Schema<ITracker>(
  {
    busName: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    bus: { type: Schema.Types.ObjectId, ref: "Bus" },
    status: {
      type: String,
      enum: ["online", "offline", "parked"],
      default: "online",
      index: true,
    },
    lastSeenText: { type: String, default: "" },
    location: { type: String, default: "" },
    purpose: { type: String, default: "" },
    note: { type: String, default: "" },
    lastUpdateAt: { type: Date },
    lastUpdateByName: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

const Tracker = model<ITracker>("Tracker", trackerSchema);
export default Tracker;

import { Schema, model } from "mongoose";
import { IBatteryAttendanceEntry } from "../interfaces/batteryAttendance.interface";

const batteryAttendanceEntrySchema = new Schema<IBatteryAttendanceEntry>(
  {
    date: { type: String, required: true, index: true },
    session: {
      type: String,
      enum: ["morning", "afternoon", "night"],
      required: true,
    },
    battery: {
      type: Schema.Types.ObjectId,
      ref: "Battery",
      required: true,
    },
    batteryCode: { type: String, required: true, trim: true },
    status: { type: String, enum: ["seen", "missing"], required: true },
    location: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
    },
    lastSeen: { type: String, default: "", trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    markedByName: { type: String, default: "" },
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

// one verdict per battery per session per day; re-marking overwrites
batteryAttendanceEntrySchema.index(
  { date: 1, session: 1, battery: 1 },
  { unique: true },
);

const BatteryAttendanceEntry = model<IBatteryAttendanceEntry>(
  "BatteryAttendanceEntry",
  batteryAttendanceEntrySchema,
);
export default BatteryAttendanceEntry;

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
    register: {
      type: String,
      enum: ["manager", "staff", "storekeeper"],
      default: "staff",
      index: true,
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

// one verdict per battery per session per register per day;
// re-marking overwrites
batteryAttendanceEntrySchema.index(
  { date: 1, session: 1, register: 1, battery: 1 },
  { unique: true },
);

const BatteryAttendanceEntry = model<IBatteryAttendanceEntry>(
  "BatteryAttendanceEntry",
  batteryAttendanceEntrySchema,
);

// the registers split an older single-register index; drop it once so
// three sets of eyes can mark the same pack (missing index is fine)
void BatteryAttendanceEntry.collection
  .dropIndex("date_1_session_1_battery_1")
  .catch(() => {});
export default BatteryAttendanceEntry;

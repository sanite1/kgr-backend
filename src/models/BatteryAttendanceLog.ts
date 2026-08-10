import { Schema, model } from "mongoose";
import { IBatteryAttendanceLog } from "../interfaces/batteryAttendance.interface";

const rowSchema = new Schema(
  {
    battery: { type: Schema.Types.ObjectId, ref: "Battery", required: true },
    batteryCode: { type: String, required: true },
    status: { type: String, enum: ["seen", "missing"], required: true },
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "night"],
      required: true,
    },
    location: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
    },
    onBus: { type: String, default: "" },
    auto: { type: Boolean, default: false },
    lastSeen: { type: String, default: "" },
  },
  { _id: false },
);

const batteryAttendanceLogSchema = new Schema<IBatteryAttendanceLog>(
  {
    logId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    rows: { type: [rowSchema], default: [] },
    totals: {
      fleet: { type: Number, required: true },
      seen: { type: Number, required: true },
      missing: { type: Number, required: true },
      unmarked: { type: Number, required: true },
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedByName: { type: String, default: "" },
    submittedByRole: { type: String, default: "" },
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

batteryAttendanceLogSchema.index({ date: 1, createdAt: 1 });

const BatteryAttendanceLog = model<IBatteryAttendanceLog>(
  "BatteryAttendanceLog",
  batteryAttendanceLogSchema,
);
export default BatteryAttendanceLog;

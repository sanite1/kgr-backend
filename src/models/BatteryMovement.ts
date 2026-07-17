import { Schema, model } from "mongoose";
import { IBatteryMovement } from "../interfaces/battery.interface";

const STATUSES = ["in_store", "charging", "on_bus", "faulty", "in_repair"];

const batteryMovementSchema = new Schema<IBatteryMovement>(
  {
    battery: {
      type: Schema.Types.ObjectId,
      ref: "Battery",
      required: true,
      index: true,
    },
    batteryCode: { type: String, required: true },
    action: {
      type: String,
      enum: ["issue", "collect", "status"],
      required: true,
    },
    fromStatus: { type: String, enum: STATUSES, required: true },
    toStatus: { type: String, enum: STATUSES, required: true },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", index: true },
    busNumber: { type: String },
    note: { type: String, default: "" },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

batteryMovementSchema.index({ battery: 1, createdAt: -1 });

const BatteryMovement = model<IBatteryMovement>(
  "BatteryMovement",
  batteryMovementSchema,
);
export default BatteryMovement;

import { Schema, model } from "mongoose";
import { IBatterySwap } from "../interfaces/batterySwap.interface";

const batterySwapSchema = new Schema<IBatterySwap>(
  {
    swapId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    bus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    busNumber: { type: String, required: true },
    initialBattery: {
      type: Schema.Types.ObjectId,
      ref: "Battery",
      required: true,
    },
    initialBatteryCode: { type: String, required: true },
    suppliedBattery: {
      type: Schema.Types.ObjectId,
      ref: "Battery",
      required: true,
      index: true,
    },
    suppliedBatteryCode: { type: String, required: true },
    tripsAdded: { type: Number, default: 0, min: 0 },
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

batterySwapSchema.index({ date: 1, createdAt: -1 });

const BatterySwap = model<IBatterySwap>("BatterySwap", batterySwapSchema);
export default BatterySwap;

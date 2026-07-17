import { Schema, model } from "mongoose";
import { IRepairJob } from "../interfaces/repair.interface";

const repairPartLineSchema = new Schema(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: String, required: true },
    amount: { type: String, required: true },
  },
  { _id: false },
);

const repairJobSchema = new Schema<IRepairJob>(
  {
    jobId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", index: true },
    busNumber: { type: String, index: true },
    battery: { type: Schema.Types.ObjectId, ref: "Battery", index: true },
    batteryCode: { type: String },
    parts: { type: [repairPartLineSchema], default: [] },
    partsCost: { type: String, default: "0" },
    laborCost: { type: String, default: "0" },
    totalCost: { type: String, default: "0" },
    status: {
      type: String,
      enum: ["open", "completed", "cancelled"],
      default: "open",
      index: true,
    },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
    closeNote: { type: String, default: "" },
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

repairJobSchema.index({ createdAt: -1 });

const RepairJob = model<IRepairJob>("RepairJob", repairJobSchema);
export default RepairJob;

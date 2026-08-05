import { Schema, model } from "mongoose";
import { IPartRequest } from "../interfaces/partRequest.interface";

const partRequestSchema = new Schema<IPartRequest>(
  {
    requestId: { type: Number, required: true, unique: true, index: true },
    // absent when the request is for a typed target, not a bus
    bus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      index: true,
    },
    busNumber: { type: String, required: true, index: true },
    item: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: String, required: true },
    amount: { type: String, required: true },
    narration: { type: String, default: "" },
    nextRequestDate: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    decisionNote: { type: String, default: "" },
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

partRequestSchema.index({ createdAt: -1 });

const PartRequest = model<IPartRequest>("PartRequest", partRequestSchema);
export default PartRequest;

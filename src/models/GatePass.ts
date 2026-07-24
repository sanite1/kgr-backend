import { Schema, model } from "mongoose";
import { IGatePass } from "../interfaces/gatePass.interface";

const itemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    purpose: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const gatePassSchema = new Schema<IGatePass>(
  {
    passId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestedByName: { type: String, default: "" },
    department: { type: String, required: true, trim: true },
    designation: { type: String, default: "", trim: true },
    items: { type: [itemSchema], default: [] },
    exitAt: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "carried_out"],
      default: "pending",
      index: true,
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedByName: { type: String },
    decidedAt: { type: Date },
    decisionNote: { type: String, default: "" },
    carriedOutBy: { type: Schema.Types.ObjectId, ref: "User" },
    carriedOutByName: { type: String },
    carriedOutAt: { type: Date },
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

gatePassSchema.index({ createdAt: -1 });
gatePassSchema.index({ status: 1, createdAt: -1 });

const GatePass = model<IGatePass>("GatePass", gatePassSchema);
export default GatePass;

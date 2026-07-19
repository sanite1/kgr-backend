import { Schema, model } from "mongoose";
import { IReceipt } from "../interfaces/receipt.interface";

const receiptSchema = new Schema<IReceipt>(
  {
    billId: { type: Number, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, unique: true, index: true },
    bus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    busNumber: { type: String, required: true, index: true },
    batteryName: { type: String, required: true, trim: true },
    batteryPercent: { type: Number, required: true, min: 0, max: 200 },
    voltage: { type: Number, default: 0, min: 0 },
    timeOut: { type: String, required: true },
    expectedTrips: { type: Number, required: true, min: 0.5 },
    unitPrice: { type: String, required: true },
    expectedAmount: { type: String, required: true },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["awaiting_payment", "paid", "void"],
      default: "awaiting_payment",
      index: true,
    },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String, default: "" },
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

receiptSchema.index({ date: 1, status: 1 });
receiptSchema.index({ bus: 1, date: 1 });
receiptSchema.index({ createdAt: -1 });

const Receipt = model<IReceipt>("Receipt", receiptSchema);
export default Receipt;

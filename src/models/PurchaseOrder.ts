import { Schema, model } from "mongoose";
import { IPurchaseOrder } from "../interfaces/purchase.interface";

const STATUSES = ["purchased", "shipping", "arrived", "delivered"];

const eventSchema = new Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orderId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    supplier: { type: String, default: "", trim: true },
    quantity: { type: Number, min: 1 },
    trackingNumber: { type: String, default: "", trim: true },
    expectedArrival: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: STATUSES,
      default: "purchased",
      index: true,
    },
    history: { type: [eventSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, default: "" },
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

purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });

const PurchaseOrder = model<IPurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema,
);
export default PurchaseOrder;

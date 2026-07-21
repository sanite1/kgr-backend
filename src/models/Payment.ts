import { Schema, model } from "mongoose";
import { IPayment } from "../interfaces/payment.interface";

const paymentSchema = new Schema<IPayment>(
  {
    receipt: {
      type: Schema.Types.ObjectId,
      ref: "Receipt",
      required: true,
      index: true,
    },
    amount: { type: String, required: true },
    method: { type: String, enum: ["cash"], default: "cash" },
    collectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    receiptDate: { type: String, required: true },
    reason: { type: String, default: "" },
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

paymentSchema.index({ date: 1, collectedBy: 1 });

const Payment = model<IPayment>("Payment", paymentSchema);
export default Payment;

import { Schema, model } from "mongoose";
import { IFinanceEntry } from "../interfaces/finance.interface";

const financeEntrySchema = new Schema<IFinanceEntry>(
  {
    kind: {
      type: String,
      enum: ["investment", "loan", "repayment", "salary", "other_debt"],
      required: true,
      index: true,
    },
    amount: { type: String, required: true },
    date: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    label: { type: String, default: "" },
    note: { type: String, default: "" },
    loan: { type: Schema.Types.ObjectId, ref: "FinanceEntry" },
    fromProfitPercent: { type: Number },
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

const FinanceEntry = model<IFinanceEntry>("FinanceEntry", financeEntrySchema);
export default FinanceEntry;

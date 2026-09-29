import { Schema, model } from "mongoose";
import { IMoneyBookEntry } from "../interfaces/moneyBook.interface";

const moneyBookEntrySchema = new Schema<IMoneyBookEntry>(
  {
    type: { type: String, enum: ["expense", "income"], required: true },
    date: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: String, required: true },
    quantity: { type: Number },
    unitPrice: { type: String },
    usdAmount: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "MoneyBookCategory" },
    categoryName: { type: String, default: "" },
    account: { type: Schema.Types.ObjectId, ref: "MoneyBookAccount" },
    accountName: { type: String, default: "" },
    note: { type: String, default: "" },
    recurring: { type: Boolean, default: false },
    recurringOf: { type: Schema.Types.ObjectId, ref: "MoneyBookEntry" },
    seeded: { type: Boolean, default: false },
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

moneyBookEntrySchema.index({ month: 1, date: -1 });
// one copy per template per month, enforced by the database so two
// requests racing to write the same month cannot double an expense
moneyBookEntrySchema.index(
  { recurringOf: 1, month: 1 },
  { unique: true, partialFilterExpression: { recurringOf: { $exists: true } } },
);

const MoneyBookEntry = model<IMoneyBookEntry>(
  "MoneyBookEntry",
  moneyBookEntrySchema,
);
export default MoneyBookEntry;

import { Schema, model } from "mongoose";
import { IMoneyBookCategory } from "../interfaces/moneyBook.interface";

const moneyBookCategorySchema = new Schema<IMoneyBookCategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    color: { type: String, default: "#0FA53A" },
    monthlyBudget: { type: Number, min: 0 },
    sortOrder: { type: Number, default: 0 },
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

const MoneyBookCategory = model<IMoneyBookCategory>(
  "MoneyBookCategory",
  moneyBookCategorySchema,
);
export default MoneyBookCategory;

import { Schema, model } from "mongoose";
import { IMoneyBookAccount } from "../interfaces/moneyBook.interface";

const moneyBookAccountSchema = new Schema<IMoneyBookAccount>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

const MoneyBookAccount = model<IMoneyBookAccount>(
  "MoneyBookAccount",
  moneyBookAccountSchema,
);
export default MoneyBookAccount;

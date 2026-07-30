import { Schema, model } from "mongoose";
import { IPriceListSetting } from "../interfaces/priceList.interface";

// one document only: the current exchange rate and the shipping notes
const priceListSettingSchema = new Schema<IPriceListSetting>(
  {
    rate: { type: Number, required: true, min: 1 },
    rateUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rateUpdatedByName: { type: String, default: "" },
    rateUpdatedAt: { type: Date },
    notes: { type: String, default: "" },
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

const PriceListSetting = model<IPriceListSetting>(
  "PriceListSetting",
  priceListSettingSchema,
);
export default PriceListSetting;

import { Schema, model } from "mongoose";
import { IPriceListItem } from "../interfaces/priceList.interface";

const priceListItemSchema = new Schema<IPriceListItem>(
  {
    name: { type: String, required: true, trim: true },
    weight: { type: String, default: "", trim: true },
    usd: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

priceListItemSchema.index({ createdAt: 1 });

const PriceListItem = model<IPriceListItem>(
  "PriceListItem",
  priceListItemSchema,
);
export default PriceListItem;

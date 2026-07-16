import { Schema, model } from "mongoose";
import { ITripPrice } from "../interfaces/tripPrice.interface";

const tripPriceSchema = new Schema<ITripPrice>(
  {
    amount: { type: String, required: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    setBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: "" },
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

tripPriceSchema.index({ effectiveFrom: -1 });

const TripPrice = model<ITripPrice>("TripPrice", tripPriceSchema);
export default TripPrice;

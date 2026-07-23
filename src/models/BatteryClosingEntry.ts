import { Schema, model } from "mongoose";
import { IBatteryClosingEntry } from "../interfaces/batteryClosing.interface";

const batteryClosingEntrySchema = new Schema<IBatteryClosingEntry>(
  {
    date: { type: String, required: true, index: true },
    batteryName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    percent: { type: Number, enum: [50, 75, 100], required: true },
    voltage: { type: String, default: "" },
    location: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
      required: true,
    },
    trips: { type: Number, default: 0, min: 0 },
    tripsAuto: { type: Boolean, default: false },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedByName: { type: String, default: "" },
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

batteryClosingEntrySchema.index({ date: 1, createdAt: 1 });

const BatteryClosingEntry = model<IBatteryClosingEntry>(
  "BatteryClosingEntry",
  batteryClosingEntrySchema,
);
export default BatteryClosingEntry;

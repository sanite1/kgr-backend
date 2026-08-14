import { Schema, model } from "mongoose";
import { IHijetEntry } from "../interfaces/hijet.interface";

const hijetEntrySchema = new Schema<IHijetEntry>(
  {
    date: { type: String, required: true, index: true },
    vehicleName: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    batteryName: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    timeOfDay: { type: String, enum: ["morning", "afternoon", "night"] },
    fromLocation: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
    },
    trips: { type: Number, enum: [1, 1.5, 2, 2.5, 3] },
    note: { type: String, default: "" },
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

hijetEntrySchema.index({ date: 1, createdAt: 1 });

const HijetEntry = model<IHijetEntry>("HijetEntry", hijetEntrySchema);
export default HijetEntry;

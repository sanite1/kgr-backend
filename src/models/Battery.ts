import { Schema, model } from "mongoose";
import { IBattery } from "../interfaces/battery.interface";

const batterySchema = new Schema<IBattery>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "faulty",
        "charging",
        "fully_charged",
        "not_charged",
        "not_in_use",
      ],
      default: "active",
      index: true,
    },
    location: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
      default: "main_yard",
      index: true,
    },
    needsCheck: { type: Boolean, default: false, index: true },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    retiredReason: {
      type: String,
      enum: ["sold", "dismantled", "accident", "bms_burnt", "other"],
    },
    idleSnoozedUntil: { type: Date },
    idleSnoozedByName: { type: String },
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

const Battery = model<IBattery>("Battery", batterySchema);

// the battery -> bus registry link was scrapped: where a pack is now
// comes from checklist and receipt sightings. Clean the old fields and
// index off existing documents; both calls are safe to fail.
Battery.collection.dropIndex("bus_1").catch(() => {});
Battery.updateMany({}, { $unset: { bus: 1, busNumber: 1 } }).catch(() => {});

export default Battery;

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
    bus: { type: Schema.Types.ObjectId, ref: "Bus", index: true },
    busNumber: { type: String },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
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
export default Battery;

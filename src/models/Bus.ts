import { Schema, model } from "mongoose";
import { IBus } from "../interfaces/bus.interface";

const busSchema = new Schema<IBus>(
  {
    number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    driverName: { type: String, default: "", trim: true },
    driverPhone: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: "" },
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

const Bus = model<IBus>("Bus", busSchema);
export default Bus;

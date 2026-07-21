import { Schema, model } from "mongoose";
import { IBatteryExitForm } from "../interfaces/batteryExitForm.interface";

const rowSchema = new Schema(
  {
    battery: { type: Schema.Types.ObjectId, ref: "Battery", required: true },
    code: { type: String, required: true },
    series: { type: String, default: "" },
    check: {
      type: String,
      enum: ["active", "faulty", "needs_check", "out_of_use", "sold", "bms"],
      required: true,
    },
    location: {
      type: String,
      enum: ["main_yard", "muhd_house", "kamila_house", "ubs"],
      required: true,
    },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const totalsSchema = new Schema(
  {
    active: { type: Number, default: 0 },
    faulty: { type: Number, default: 0 },
    needsCheck: { type: Number, default: 0 },
    outOfUse: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    bms: { type: Number, default: 0 },
  },
  { _id: false },
);

const batteryExitFormSchema = new Schema<IBatteryExitForm>(
  {
    formId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issuedByName: { type: String, default: "" },
    rows: { type: [rowSchema], default: [] },
    totals: { type: totalsSchema, default: () => ({}) },
    byLocation: { type: Map, of: Number, default: {} },
    comments: { type: String, default: "" },
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

batteryExitFormSchema.index({ createdAt: -1 });

const BatteryExitForm = model<IBatteryExitForm>(
  "BatteryExitForm",
  batteryExitFormSchema,
);
export default BatteryExitForm;

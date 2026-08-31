import { Schema, model } from "mongoose";
import { IChecklistEntry } from "../interfaces/checklist.interface";

const checklistEntrySchema = new Schema<IChecklistEntry>(
  {
    date: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["security", "admin"],
      required: true,
      index: true,
    },
    busName: { type: String, required: true, trim: true, uppercase: true },
    session: {
      type: String,
      enum: ["morning", "evening"],
      required: true,
    },
    batteryName: { type: String, required: true, trim: true, uppercase: true },
    trips: { type: Number, enum: [1, 1.5, 2, 2.5, 3], required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedByName: { type: String, default: "" },
    // every admin correction, oldest first; the original survives in
    // the first edit's "from"
    edits: {
      type: [
        new Schema(
          {
            at: { type: Date, required: true },
            by: { type: Schema.Types.ObjectId, ref: "User", required: true },
            byName: { type: String, default: "" },
            note: { type: String, default: "" },
            from: {
              batteryName: { type: String, default: "" },
              trips: { type: Number, default: 0 },
            },
            to: {
              batteryName: { type: String, default: "" },
              trips: { type: Number, default: 0 },
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
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

checklistEntrySchema.index({ date: 1, kind: 1, createdAt: 1 });

const ChecklistEntry = model<IChecklistEntry>(
  "ChecklistEntry",
  checklistEntrySchema,
);
export default ChecklistEntry;

import { Schema, model } from "mongoose";
import { ISavingsGoalEntry } from "../interfaces/savingsGoal.interface";

const change = {
  date: { type: String, default: "" },
  kind: { type: String, default: "deposit" },
  amount: { type: Number, default: 0 },
  note: { type: String, default: "" },
};

const entrySchema = new Schema<ISavingsGoalEntry>(
  {
    goal: {
      type: Schema.Types.ObjectId,
      ref: "SavingsGoal",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["deposit", "interest", "withdrawal"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedByName: { type: String, default: "" },
    // every correction, oldest first; the original survives in the
    // first edit's "from"
    edits: {
      type: [
        new Schema(
          {
            at: { type: Date, required: true },
            by: { type: Schema.Types.ObjectId, ref: "User", required: true },
            byName: { type: String, default: "" },
            note: { type: String, default: "" },
            from: change,
            to: change,
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

const SavingsGoalEntry = model<ISavingsGoalEntry>(
  "SavingsGoalEntry",
  entrySchema,
);
export default SavingsGoalEntry;

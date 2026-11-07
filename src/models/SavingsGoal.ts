import { Schema, model } from "mongoose";
import { ISavingsGoal } from "../interfaces/savingsGoal.interface";

const savingsGoalSchema = new Schema<ISavingsGoal>(
  {
    name: { type: String, required: true, trim: true },
    dailyAmount: { type: Number, required: true, min: 0 },
    ratePct: { type: Number, required: true, min: 0 },
    months: { type: Number, required: true, min: 1 },
    startDate: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    account: { type: String, default: "" },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "reached", "archived"],
      default: "active",
      index: true,
    },
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

const SavingsGoal = model<ISavingsGoal>("SavingsGoal", savingsGoalSchema);
export default SavingsGoal;

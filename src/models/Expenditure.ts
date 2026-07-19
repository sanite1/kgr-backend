import { Schema, model } from "mongoose";
import { IExpenditure } from "../interfaces/expenditure.interface";

const expenditureSchema = new Schema<IExpenditure>(
  {
    expenditureId: { type: Number, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ExpenditureCategory",
      required: true,
      index: true,
    },
    categoryName: { type: String, required: true, index: true },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", index: true },
    busNumber: { type: String, index: true },
    description: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

expenditureSchema.index({ date: -1, createdAt: -1 });

const Expenditure = model<IExpenditure>("Expenditure", expenditureSchema);
export default Expenditure;

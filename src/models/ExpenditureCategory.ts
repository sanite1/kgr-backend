import { Schema, model } from "mongoose";
import { IExpenditureCategory } from "../interfaces/expenditure.interface";

const expenditureCategorySchema = new Schema<IExpenditureCategory>(
  {
    name: { type: String, required: true, trim: true, index: true },
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

const ExpenditureCategory = model<IExpenditureCategory>(
  "ExpenditureCategory",
  expenditureCategorySchema,
);
export default ExpenditureCategory;

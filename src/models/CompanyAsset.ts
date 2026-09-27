import { Schema, model } from "mongoose";
import { ICompanyAsset } from "../interfaces/companyAsset.interface";

const companyAssetSchema = new Schema<ICompanyAsset>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["appreciating", "depreciating"],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "NGN"], required: true },
    unitPrice: { type: String, required: true },
    acquiredOn: { type: String },
    note: { type: String, default: "" },
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

const CompanyAsset = model<ICompanyAsset>("CompanyAsset", companyAssetSchema);
export default CompanyAsset;

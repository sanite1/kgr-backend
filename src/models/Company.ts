import { Schema, model, Document } from "mongoose";

// A company profile that can receive public contact messages.
// isActive gates submissions (403 when paused).
export interface ICompany extends Document {
  name: string;
  email: string; // notification recipient for incoming messages
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Company = model<ICompany>("Company", companySchema);
export default Company;

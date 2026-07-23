import { Schema, model } from "mongoose";
import { IPartnershipRequest } from "../interfaces/partnership.interface";

const fieldSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    title: { type: String, required: true },
    fields: { type: [fieldSchema], default: [] },
  },
  { _id: false },
);

const partnershipRequestSchema = new Schema<IPartnershipRequest>(
  {
    requestId: { type: Number, required: true, unique: true, index: true },
    kind: {
      type: String,
      enum: ["corporate", "individual"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    sections: { type: [sectionSchema], default: [] },
    status: {
      type: String,
      enum: ["new", "in_review", "contacted", "closed"],
      default: "new",
      index: true,
    },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: { type: Date },
    adminNote: { type: String, default: "" },
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

partnershipRequestSchema.index({ createdAt: -1 });

const PartnershipRequest = model<IPartnershipRequest>(
  "PartnershipRequest",
  partnershipRequestSchema,
);
export default PartnershipRequest;

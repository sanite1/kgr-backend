import { Schema, model, Document } from "mongoose";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  metadata: Record<string, any>;
  status: "new" | "read" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["new", "read", "resolved"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ createdAt: -1 });

const ContactMessage = model<IContactMessage>(
  "ContactMessage",
  contactMessageSchema,
);
export default ContactMessage;

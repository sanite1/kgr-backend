import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // select: false: services that need it must .select("+password")
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["staff", "cashier", "storekeeper", "security", "manager", "admin"],
      default: "staff",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    // per-user module overrides; unset = the role's default access
    access: { type: [String], default: undefined },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

const User = model<IUser>("User", userSchema);
export default User;

import { Schema, model } from "mongoose";
import { IInventoryItem } from "../interfaces/inventory.interface";

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ["part", "battery", "consumable", "solar", "conversion"],
      default: "part",
      index: true,
    },
    unit: { type: String, default: "pcs", trim: true },
    quantityOnHand: { type: Number, default: 0, min: 0 },
    unitCost: { type: String, required: true },
    minLevel: { type: Number, default: 0, min: 0 },
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

const InventoryItem = model<IInventoryItem>(
  "InventoryItem",
  inventoryItemSchema,
);
export default InventoryItem;

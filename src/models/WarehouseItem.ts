import { Schema, model } from "mongoose";
import { IWarehouseItem } from "../interfaces/warehouse.interface";

const warehouseItemSchema = new Schema<IWarehouseItem>(
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

const WarehouseItem = model<IWarehouseItem>(
  "WarehouseItem",
  warehouseItemSchema,
);
export default WarehouseItem;

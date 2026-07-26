import { Schema, model } from "mongoose";
import { IWarehouseMovement } from "../interfaces/warehouse.interface";

const warehouseMovementSchema = new Schema<IWarehouseMovement>(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseItem",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["in", "out", "adjust"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

warehouseMovementSchema.index({ item: 1, createdAt: -1 });

const WarehouseMovement = model<IWarehouseMovement>(
  "WarehouseMovement",
  warehouseMovementSchema,
);
export default WarehouseMovement;

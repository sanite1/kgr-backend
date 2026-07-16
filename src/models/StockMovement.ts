import { Schema, model } from "mongoose";
import { IStockMovement } from "../interfaces/inventory.interface";

const stockMovementSchema = new Schema<IStockMovement>(
  {
    item: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["in", "out", "adjust"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    relatedRequest: { type: Schema.Types.ObjectId, ref: "PartRequest" },
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

stockMovementSchema.index({ item: 1, createdAt: -1 });

const StockMovement = model<IStockMovement>(
  "StockMovement",
  stockMovementSchema,
);
export default StockMovement;

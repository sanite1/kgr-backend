import { Document, Types } from "mongoose";
import { ItemCategory, StockMovementType } from "./helper.interface";

// The off-site warehouse mirrors yard inventory exactly: same fields,
// its own collection so the two stock pools never mix.
export interface IWarehouseItem extends Document {
  name: string;
  category: ItemCategory;
  unit: string; // "pcs", "litres", ...
  quantityOnHand: number;
  unitCost: string; // money as strings
  minLevel: number; // low-stock threshold
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWarehouseMovement extends Document {
  item: Types.ObjectId;
  type: StockMovementType;
  quantity: number; // always positive; direction comes from type
  balanceAfter: number;
  note: string;
  by: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Payloads and queries are the inventory ones, re-exported so the two
// modules cannot drift apart.
export type {
  ICreateItemRequest,
  IUpdateItemRequest,
  IAdjustStockRequest,
  IItemsQuery,
  IMovementsQuery,
} from "./inventory.interface";

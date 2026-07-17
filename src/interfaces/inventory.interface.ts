import { Document, Types } from "mongoose";
import { ItemCategory, StockMovementType } from "./helper.interface";

export interface IInventoryItem extends Document {
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

export interface IStockMovement extends Document {
  item: Types.ObjectId;
  type: StockMovementType;
  quantity: number; // always positive; direction comes from type
  balanceAfter: number;
  note: string;
  relatedRequest?: Types.ObjectId;
  relatedRepair?: Types.ObjectId;
  by: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateItemRequest {
  name: string;
  category: ItemCategory;
  unit?: string;
  quantityOnHand?: number;
  unitCost: string;
  minLevel?: number;
}

export interface IUpdateItemRequest {
  name?: string;
  category?: ItemCategory;
  unit?: string;
  unitCost?: string;
  minLevel?: number;
  isActive?: boolean;
}

export interface IAdjustStockRequest {
  type: StockMovementType;
  quantity: number; // for "adjust" this is the new absolute quantity
  note?: string;
}

export interface IItemsQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  isActive?: string;
  search?: string;
  lowStock?: string; // "true" filters to items at/below minLevel
}

export interface IMovementsQuery {
  page?: number;
  pageSize?: number;
}

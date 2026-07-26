import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import WarehouseItem from "../models/WarehouseItem";
import WarehouseMovement from "../models/WarehouseMovement";
import { alertIfLowStock } from "../helpers/lowStock";
import {
  ICreateItemRequest,
  IUpdateItemRequest,
  IAdjustStockRequest,
  IItemsQuery,
  IMovementsQuery,
} from "../interfaces/warehouse.interface";

// POST /api/warehouse (store)
export const createWarehouseItemService = async (
  payload: ICreateItemRequest,
  createdBy: string,
) => {
  const existing = await WarehouseItem.findOne({
    name: new RegExp(
      `^${payload.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i",
    ),
  });
  if (existing) {
    throw new ApiError(
      409,
      `"${existing.name}" already exists in the warehouse`,
    );
  }

  const item = await WarehouseItem.create({
    name: payload.name.trim(),
    category: payload.category,
    unit: payload.unit || "pcs",
    quantityOnHand: payload.quantityOnHand ?? 0,
    unitCost: payload.unitCost,
    minLevel: payload.minLevel ?? 0,
    createdBy,
  });

  if (item.quantityOnHand > 0) {
    await WarehouseMovement.create({
      item: item._id,
      type: "in",
      quantity: item.quantityOnHand,
      balanceAfter: item.quantityOnHand,
      note: "Opening stock",
      by: createdBy,
    });
  }

  return new ApiResponse(201, "Item added to the warehouse", item.toJSON());
};

// GET /api/warehouse
export const getWarehouseItemsService = async (query: IItemsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.category) filter.category = query.category;
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.search) {
    filter.name = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  }
  if (query.lowStock === "true") {
    filter.$expr = { $lte: ["$quantityOnHand", "$minLevel"] };
    filter.isActive = true;
  }

  const [items, totalItems] = await Promise.all([
    WarehouseItem.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    WarehouseItem.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    items.map((i) => i.toJSON()),
    totalItems,
    page,
    pageSize,
    "Warehouse items retrieved successfully",
  );
};

// PATCH /api/warehouse/:id (store)
export const updateWarehouseItemService = async (
  id: string,
  payload: IUpdateItemRequest,
  by: string,
) => {
  const item = await WarehouseItem.findById(id);
  if (!item) throw new ApiError(404, "Item not found");

  // sensitive edits leave a zero-quantity movement so the item's
  // history shows who changed what, not just stock counts
  const changes: string[] = [];
  if (payload.name !== undefined && payload.name.trim() !== item.name) {
    changes.push(`Renamed "${item.name}" to "${payload.name.trim()}"`);
  }
  if (payload.unitCost !== undefined && payload.unitCost !== item.unitCost) {
    changes.push(`Unit cost ${item.unitCost} to ${payload.unitCost}`);
  }
  if (payload.isActive !== undefined && payload.isActive !== item.isActive) {
    changes.push(payload.isActive ? "Item reactivated" : "Item deactivated");
  }

  if (payload.name !== undefined) item.name = payload.name.trim();
  if (payload.category !== undefined) item.category = payload.category;
  if (payload.unit !== undefined) item.unit = payload.unit;
  if (payload.unitCost !== undefined) item.unitCost = payload.unitCost;
  if (payload.minLevel !== undefined) item.minLevel = payload.minLevel;
  if (payload.isActive !== undefined) item.isActive = payload.isActive;
  await item.save();

  if (changes.length > 0) {
    await WarehouseMovement.create({
      item: item._id,
      type: "adjust",
      quantity: 0,
      balanceAfter: item.quantityOnHand,
      note: changes.join("; "),
      by,
    });
  }

  return new ApiResponse(200, "Item updated successfully", item.toJSON());
};

// POST /api/warehouse/:id/adjust (store): in adds, out subtracts,
// adjust sets the absolute quantity. Every change leaves a movement.
export const adjustWarehouseStockService = async (
  id: string,
  payload: IAdjustStockRequest,
  by: string,
) => {
  const item = await WarehouseItem.findById(id);
  if (!item) throw new ApiError(404, "Item not found");

  const previousQuantity = item.quantityOnHand;
  let movementQuantity = payload.quantity;
  if (payload.type === "in") {
    item.quantityOnHand += payload.quantity;
  } else if (payload.type === "out") {
    if (item.quantityOnHand < payload.quantity) {
      throw new ApiError(
        400,
        `Only ${item.quantityOnHand} ${item.unit} of "${item.name}" in the warehouse`,
      );
    }
    item.quantityOnHand -= payload.quantity;
  } else {
    movementQuantity = Math.abs(payload.quantity - item.quantityOnHand);
    item.quantityOnHand = payload.quantity;
  }
  await item.save();

  await WarehouseMovement.create({
    item: item._id,
    type: payload.type,
    quantity: movementQuantity,
    balanceAfter: item.quantityOnHand,
    note: payload.note || "",
    by,
  });

  alertIfLowStock(item, previousQuantity);

  return new ApiResponse(200, "Stock updated successfully", item.toJSON());
};

// GET /api/warehouse/:id/movements
export const getWarehouseMovementsService = async (
  id: string,
  query: IMovementsQuery,
) => {
  const item = await WarehouseItem.findById(id);
  if (!item) throw new ApiError(404, "Item not found");

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [movements, totalItems] = await Promise.all([
    WarehouseMovement.find({ item: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("by", "firstName lastName"),
    WarehouseMovement.countDocuments({ item: id }),
  ]);

  return PaginatedResponse.build(
    movements.map((m) => m.toJSON()),
    totalItems,
    page,
    pageSize,
    "Movements retrieved successfully",
  );
};

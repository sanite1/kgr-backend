import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createWarehouseItemService,
  getWarehouseItemsService,
  updateWarehouseItemService,
  adjustWarehouseStockService,
  getWarehouseMovementsService,
} from "../services/warehouse.service";
import {
  ICreateItemRequest,
  IUpdateItemRequest,
  IAdjustStockRequest,
  IItemsQuery,
  IMovementsQuery,
} from "../interfaces/warehouse.interface";

export const createWarehouseItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createWarehouseItemService(
      req.body as ICreateItemRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getWarehouseItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getWarehouseItemsService(req.query as IItemsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateWarehouseItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateWarehouseItemService(
      req.params.id,
      req.body as IUpdateItemRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const adjustWarehouseStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await adjustWarehouseStockService(
      req.params.id,
      req.body as IAdjustStockRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getWarehouseMovements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getWarehouseMovementsService(
      req.params.id,
      req.query as IMovementsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

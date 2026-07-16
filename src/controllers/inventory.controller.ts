import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createItemService,
  getItemsService,
  updateItemService,
  adjustStockService,
  getMovementsService,
} from "../services/inventory.service";
import {
  ICreateItemRequest,
  IUpdateItemRequest,
  IAdjustStockRequest,
  IItemsQuery,
  IMovementsQuery,
} from "../interfaces/inventory.interface";

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createItemService(
      req.body as ICreateItemRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getItemsService(req.query as IItemsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateItemService(
      req.params.id,
      req.body as IUpdateItemRequest,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await adjustStockService(
      req.params.id,
      req.body as IAdjustStockRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMovementsService(
      req.params.id,
      req.query as IMovementsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

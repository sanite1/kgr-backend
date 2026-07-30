import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getPriceListService,
  createPriceItemService,
  updatePriceItemService,
  deletePriceItemService,
  updatePriceSettingsService,
} from "../services/priceList.service";
import {
  ICreatePriceItem,
  IUpdatePriceItem,
  IUpdatePriceSettings,
} from "../interfaces/priceList.interface";

export const getPriceList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getPriceListService(String(req.user?._id));
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createPriceItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createPriceItemService(
      req.body as ICreatePriceItem,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updatePriceItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updatePriceItemService(
      req.params.id,
      req.body as IUpdatePriceItem,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deletePriceItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deletePriceItemService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updatePriceSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updatePriceSettingsService(
      req.body as IUpdatePriceSettings,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

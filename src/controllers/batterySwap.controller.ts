import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createSwapService,
  getSwapsService,
} from "../services/batterySwap.service";
import {
  ICreateBatterySwap,
  IBatterySwapsQuery,
} from "../interfaces/batterySwap.interface";

export const createSwap = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createSwapService(
      req.body as ICreateBatterySwap,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getSwaps = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getSwapsService(req.query as IBatterySwapsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

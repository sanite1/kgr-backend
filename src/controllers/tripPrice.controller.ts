import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getCurrentTripPriceService,
  setTripPriceService,
  getTripPriceHistoryService,
} from "../services/tripPrice.service";
import {
  ISetTripPriceRequest,
  ITripPriceHistoryQuery,
} from "../interfaces/tripPrice.interface";

export const getCurrentTripPrice = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getCurrentTripPriceService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const setTripPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await setTripPriceService(
      req.body as ISetTripPriceRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTripPriceHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTripPriceHistoryService(
      req.query as ITripPriceHistoryQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

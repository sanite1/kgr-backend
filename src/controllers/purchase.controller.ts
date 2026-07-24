import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createPurchaseService,
  getPurchasesService,
  updatePurchaseService,
  setPurchaseStatusService,
} from "../services/purchase.service";
import {
  ICreatePurchase,
  IUpdatePurchase,
  ISetPurchaseStatus,
  IPurchasesQuery,
} from "../interfaces/purchase.interface";

export const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createPurchaseService(
      req.body as ICreatePurchase,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getPurchasesService(req.query as IPurchasesQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updatePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updatePurchaseService(
      req.params.id,
      req.body as IUpdatePurchase,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const setPurchaseStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await setPurchaseStatusService(
      req.params.id,
      req.body as ISetPurchaseStatus,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createReceiptService,
  getReceiptsService,
  getReceiptService,
  checkInReceiptService,
  voidReceiptService,
  getReceiptSummaryService,
  getOutstandingSummaryService,
} from "../services/receipt.service";
import {
  ICreateReceiptRequest,
  IReceiptsQuery,
  IVoidReceiptRequest,
  IReceiptSummaryQuery,
} from "../interfaces/receipt.interface";

export const createReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createReceiptService(
      req.body as ICreateReceiptRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getReceiptsService(req.query as IReceiptsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getReceiptService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const checkInReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await checkInReceiptService(
      req.params.id,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const voidReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await voidReceiptService(
      req.params.id,
      req.body as IVoidReceiptRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getOutstandingSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getOutstandingSummaryService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getReceiptSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getReceiptSummaryService(
      req.query as IReceiptSummaryQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  payReceiptService,
  getPaymentsService,
  getDailyAccountService,
  exportPaymentsCsvService,
} from "../services/payment.service";
import {
  IPayReceiptRequest,
  IPaymentsQuery,
  IDailyAccountQuery,
  IExportPaymentsQuery,
} from "../interfaces/payment.interface";

export const payReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await payReceiptService(
      req.body as IPayReceiptRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getPaymentsService(
      req.query as IPaymentsQuery,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDailyAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getDailyAccountService(
      req.query as IDailyAccountQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

// CSV download: writes the file directly instead of the JSON envelope
export const exportPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { filename, csv } = await exportPaymentsCsvService(
      req.query as IExportPaymentsQuery,
      String(req.user?._id),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

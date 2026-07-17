import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getMonthlyReportService,
  getExpenseReportService,
} from "../services/report.service";
import {
  IMonthlyReportQuery,
  IExpenseReportQuery,
} from "../interfaces/report.interface";

export const getMonthlyReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMonthlyReportService(
      req.query as IMonthlyReportQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getExpenseReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getExpenseReportService(
      req.query as IExpenseReportQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

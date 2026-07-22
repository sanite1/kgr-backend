import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  parseTrackerTextService,
  createTrackerReportService,
  getTrackerReportsService,
  getTrackerReportService,
  getMileageSummaryService,
} from "../services/trackerReport.service";
import {
  ICreateTrackerReport,
  ITrackerReportsQuery,
  IMileageQuery,
} from "../interfaces/trackerReport.interface";

export const parseTrackerText = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await parseTrackerTextService(String(req.body.text));
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createTrackerReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createTrackerReportService(
      req.body as ICreateTrackerReport,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTrackerReports = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTrackerReportsService(
      req.query as ITrackerReportsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTrackerReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTrackerReportService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getMileageSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMileageSummaryService(req.query as IMileageQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

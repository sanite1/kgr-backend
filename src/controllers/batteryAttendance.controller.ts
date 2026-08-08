import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getAttendanceFleetService,
  createAttendanceLogService,
  getAttendanceLogsService,
  getAttendanceLogService,
  getAttendanceCompareService,
  deleteAttendanceLogService,
} from "../services/batteryAttendance.service";
import {
  ICreateAttendanceLog,
  IAttendanceLogsQuery,
  IAttendanceCompareQuery,
} from "../interfaces/batteryAttendance.interface";

export const getAttendanceFleet = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceFleetService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createAttendanceLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createAttendanceLogService(
      req.body as ICreateAttendanceLog,
      { id: String(req.user?._id), role: String(req.user?.role) },
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceLogsService(
      req.query as IAttendanceLogsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceLogService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceCompare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceCompareService(
      req.query as unknown as IAttendanceCompareQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteAttendanceLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteAttendanceLogService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

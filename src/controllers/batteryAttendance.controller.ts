import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getAttendanceService,
  markAttendanceService,
  getAttendanceDaysService,
  clearAttendanceService,
} from "../services/batteryAttendance.service";
import {
  IMarkAttendance,
  IAttendanceQuery,
  IAttendanceDaysQuery,
} from "../interfaces/batteryAttendance.interface";

export const getAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceService(
      req.query as unknown as IAttendanceQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await markAttendanceService(req.body as IMarkAttendance, {
      id: String(req.user?._id),
    });
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceDays = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getAttendanceDaysService(
      req.query as IAttendanceDaysQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const clearAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await clearAttendanceService(req.params.id, {
      id: String(req.user?._id),
      role: String(req.user?.role),
    });
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

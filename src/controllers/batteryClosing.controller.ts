import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createClosingEntryService,
  getClosingEntriesService,
  getClosingDaysService,
  deleteClosingEntryService,
} from "../services/batteryClosing.service";
import {
  ICreateClosingEntry,
  IClosingEntriesQuery,
  IClosingDaysQuery,
} from "../interfaces/batteryClosing.interface";

export const createClosingEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createClosingEntryService(
      req.body as ICreateClosingEntry,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getClosingEntries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getClosingEntriesService(
      req.query as IClosingEntriesQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getClosingDays = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getClosingDaysService(req.query as IClosingDaysQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteClosingEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteClosingEntryService(req.params.id, {
      id: String(req.user?._id),
      role: String(req.user?.role),
    });
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

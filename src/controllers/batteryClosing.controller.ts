import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createClosingEntryService,
  getClosingEntriesService,
  getClosingDaysService,
  deleteClosingEntryService,
  markClosingWorkedService,
} from "../services/batteryClosing.service";
import {
  ICreateClosingEntry,
  IClosingEntriesQuery,
  IClosingDaysQuery,
  ClosingSheetKey,
} from "../interfaces/batteryClosing.interface";

// One set of handlers per sheet: the main yard routes and the Muh'd &
// Kamila house routes share everything except which sheet they write.
export const makeClosingControllers = (sheet: ClosingSheetKey) => ({
  createClosingEntry: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await createClosingEntryService(
        req.body as ICreateClosingEntry,
        String(req.user?._id),
        sheet,
      );
      sendResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  getClosingEntries: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await getClosingEntriesService(
        req.query as IClosingEntriesQuery,
        sheet,
      );
      sendResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  getClosingDays: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getClosingDaysService(
        req.query as IClosingDaysQuery,
        sheet,
      );
      sendResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  markClosingWorked: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await markClosingWorkedService(
        req.params.id,
        !!(req.body as { worked: boolean }).worked,
        {
          id: String(req.user?._id),
          role: String(req.user?.role),
        },
      );
      sendResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  deleteClosingEntry: async (
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
  },
});

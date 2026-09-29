import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getFinanceOverviewService,
  getFinanceMonthsService,
  getFinanceEntriesService,
  createFinanceEntryService,
  buyDownService,
  deleteFinanceEntryService,
  getFinanceSeriesService,
} from "../services/finance.service";
import {
  ICreateFinanceEntry,
  IBuyDown,
  IFinanceEntriesQuery,
} from "../interfaces/finance.interface";

const wrap =
  (fn: (req: Request) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendResponse(res, await fn(req));
    } catch (error) {
      next(error);
    }
  };

export const getFinanceOverview = wrap((req) =>
  getFinanceOverviewService(String(req.user?._id)),
);
export const getFinanceMonths = wrap((req) =>
  getFinanceMonthsService(Number(req.query.limit) || 12, String(req.user?._id)),
);
export const getFinanceEntries = wrap((req) =>
  getFinanceEntriesService(req.query as IFinanceEntriesQuery),
);
export const createFinanceEntry = wrap((req) =>
  createFinanceEntryService(
    req.body as ICreateFinanceEntry,
    String(req.user?._id),
  ),
);
export const buyDown = wrap((req) =>
  buyDownService(req.body as IBuyDown, String(req.user?._id)),
);
export const deleteFinanceEntry = wrap((req) =>
  deleteFinanceEntryService(req.params.id),
);
export const getFinanceSeries = wrap((req) =>
  getFinanceSeriesService(String(req.query.range || ""), String(req.user?._id)),
);

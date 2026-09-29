import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import * as svc from "../services/moneyBook.service";
import {
  ICreateMoneyBookEntry,
  IUpdateMoneyBookEntry,
  IMoneyBookEntriesQuery,
  IMoneyBookReportsQuery,
  ICreateMoneyBookCategory,
} from "../interfaces/moneyBook.interface";

const wrap =
  (fn: (req: Request) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendResponse(res, await fn(req));
    } catch (error) {
      next(error);
    }
  };
const me = (req: Request) => String(req.user?._id);

export const getOverview = wrap((req) =>
  svc.getMoneyBookOverviewService(
    req.query.month ? String(req.query.month) : undefined,
    me(req),
  ),
);
export const getEntries = wrap((req) =>
  svc.getMoneyBookEntriesService(
    req.query as unknown as IMoneyBookEntriesQuery,
    me(req),
  ),
);
export const getReports = wrap((req) =>
  svc.getMoneyBookReportsService(
    req.query as unknown as IMoneyBookReportsQuery,
    me(req),
  ),
);
export const createEntry = wrap((req) =>
  svc.createMoneyBookEntryService(req.body as ICreateMoneyBookEntry, me(req)),
);
export const updateEntry = wrap((req) =>
  svc.updateMoneyBookEntryService(
    req.params.id,
    req.body as IUpdateMoneyBookEntry,
  ),
);
export const deleteEntry = wrap((req) =>
  svc.deleteMoneyBookEntryService(req.params.id),
);
export const getMeta = wrap(() => svc.getMoneyBookMetaService());
export const createCategory = wrap((req) =>
  svc.createMoneyBookCategoryService(req.body as ICreateMoneyBookCategory),
);
export const updateCategory = wrap((req) =>
  svc.updateMoneyBookCategoryService(
    req.params.id,
    req.body as Partial<ICreateMoneyBookCategory>,
  ),
);
export const deleteCategory = wrap((req) =>
  svc.deleteMoneyBookCategoryService(req.params.id),
);
export const createAccount = wrap((req) =>
  svc.createMoneyBookAccountService(String(req.body.name)),
);
export const deleteAccount = wrap((req) =>
  svc.deleteMoneyBookAccountService(req.params.id),
);

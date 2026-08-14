import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createHijetEntryService,
  getHijetEntriesService,
  getHijetSummaryService,
  deleteHijetEntryService,
} from "../services/hijet.service";
import {
  ICreateHijetEntry,
  IHijetEntriesQuery,
} from "../interfaces/hijet.interface";

export const createHijetEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createHijetEntryService(
      req.body as ICreateHijetEntry,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getHijetEntries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getHijetEntriesService(
      req.query as IHijetEntriesQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getHijetSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getHijetSummaryService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteHijetEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteHijetEntryService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

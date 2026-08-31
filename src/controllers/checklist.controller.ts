import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import { UserRole } from "../interfaces/helper.interface";
import {
  createChecklistEntryService,
  getChecklistService,
  getChecklistCompareService,
  getChecklistReceiptsCompareService,
  updateChecklistEntryService,
  getChecklistDaysService,
  deleteChecklistEntryService,
} from "../services/checklist.service";
import {
  ICreateChecklistEntry,
  IUpdateChecklistEntry,
  IChecklistQuery,
  IChecklistCompareQuery,
  IChecklistDaysQuery,
} from "../interfaces/checklist.interface";

const requester = (req: Request) => ({
  id: String(req.user?._id),
  role: req.user?.role as UserRole,
});

export const createChecklistEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createChecklistEntryService(
      req.body as ICreateChecklistEntry,
      requester(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getChecklist = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getChecklistService(
      req.query as unknown as IChecklistQuery,
      req.user?.role as UserRole,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getChecklistCompare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getChecklistCompareService(
      req.query as IChecklistCompareQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getChecklistReceiptsCompare = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getChecklistReceiptsCompareService(
      req.query as unknown as IChecklistCompareQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateChecklistEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateChecklistEntryService(
      req.params.id,
      req.body as IUpdateChecklistEntry,
      { id: String(req.user?._id), role: String(req.user?.role) },
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getChecklistDays = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getChecklistDaysService(
      req.query as IChecklistDaysQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteChecklistEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteChecklistEntryService(
      req.params.id,
      requester(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

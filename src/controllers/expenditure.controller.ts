import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getExpenditureCategoriesService,
  createExpenditureCategoryService,
  updateExpenditureCategoryService,
  createExpenditureService,
  updateExpenditureService,
  deleteExpenditureService,
  getExpendituresService,
  getExpenditureSummaryService,
} from "../services/expenditure.service";
import {
  ICreateExpenditureCategory,
  IUpdateExpenditureCategory,
  ICreateExpenditure,
  IUpdateExpenditure,
  IExpendituresQuery,
  IExpenditureSummaryQuery,
} from "../interfaces/expenditure.interface";

const uid = (req: Request) => String(req.user?._id);

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    sendResponse(res, await getExpenditureCategoriesService());
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createExpenditureCategoryService(
      req.body as ICreateExpenditureCategory,
      uid(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateExpenditureCategoryService(
      req.params.id,
      req.body as IUpdateExpenditureCategory,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getExpenditures = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getExpendituresService(
      req.query as IExpendituresQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getExpenditureSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getExpenditureSummaryService(
      req.query as IExpenditureSummaryQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createExpenditure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createExpenditureService(
      req.body as ICreateExpenditure,
      uid(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateExpenditure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateExpenditureService(
      req.params.id,
      req.body as IUpdateExpenditure,
      uid(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteExpenditure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    sendResponse(res, await deleteExpenditureService(req.params.id));
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createRepairJobService,
  getRepairJobsService,
  addRepairPartService,
  completeRepairJobService,
  cancelRepairJobService,
} from "../services/repair.service";
import {
  ICreateRepairJob,
  ICompleteRepairJob,
  ICancelRepairJob,
  IRepairPartInput,
  IRepairJobsQuery,
} from "../interfaces/repair.interface";

export const createRepairJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createRepairJobService(
      req.body as ICreateRepairJob,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getRepairJobs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getRepairJobsService(req.query as IRepairJobsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const addRepairPart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await addRepairPartService(
      req.params.id,
      req.body as IRepairPartInput,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const completeRepairJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await completeRepairJobService(
      req.params.id,
      req.body as ICompleteRepairJob,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const cancelRepairJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await cancelRepairJobService(
      req.params.id,
      req.body as ICancelRepairJob,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

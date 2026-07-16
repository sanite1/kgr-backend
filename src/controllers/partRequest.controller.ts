import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createPartRequestService,
  getPartRequestsService,
  approvePartRequestService,
  declinePartRequestService,
  getBusExpenseService,
} from "../services/partRequest.service";
import {
  ICreatePartRequest,
  IDecideRequest,
  IPartRequestsQuery,
  IBusExpenseQuery,
} from "../interfaces/partRequest.interface";

export const createPartRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createPartRequestService(
      req.body as ICreatePartRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getPartRequestsService(
      req.query as IPartRequestsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const approvePartRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await approvePartRequestService(
      req.params.id,
      req.body as IDecideRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const declinePartRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await declinePartRequestService(
      req.params.id,
      req.body as IDecideRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBusExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusExpenseService(req.query as IBusExpenseQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

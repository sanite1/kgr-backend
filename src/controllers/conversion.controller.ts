import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  submitConversionService,
  getConversionsService,
  updateConversionStatusService,
} from "../services/conversion.service";
import {
  ISubmitConversionRequest,
  IUpdateConversionStatus,
  IConversionsQuery,
} from "../interfaces/conversion.interface";

export const submitConversion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await submitConversionService(
      req.body as ISubmitConversionRequest,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getConversions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getConversionsService(req.query as IConversionsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateConversionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateConversionStatusService(
      req.params.id,
      req.body as IUpdateConversionStatus,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

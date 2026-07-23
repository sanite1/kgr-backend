import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  submitPartnershipService,
  getPartnershipsService,
  updatePartnershipStatusService,
} from "../services/partnership.service";
import {
  ISubmitPartnershipRequest,
  IUpdatePartnershipStatus,
  IPartnershipsQuery,
} from "../interfaces/partnership.interface";

export const submitPartnership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await submitPartnershipService(
      req.body as ISubmitPartnershipRequest,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartnerships = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getPartnershipsService(
      req.query as IPartnershipsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updatePartnershipStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updatePartnershipStatusService(
      req.params.id,
      req.body as IUpdatePartnershipStatus,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

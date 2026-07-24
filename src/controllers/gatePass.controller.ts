import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import { UserRole } from "../interfaces/helper.interface";
import {
  createGatePassService,
  getGatePassesService,
  approveGatePassService,
  declineGatePassService,
  carryOutGatePassService,
} from "../services/gatePass.service";
import {
  ICreateGatePass,
  IDecideGatePass,
  IGatePassesQuery,
} from "../interfaces/gatePass.interface";

const requester = (req: Request) => ({
  id: String(req.user?._id),
  role: req.user?.role as UserRole,
});

export const createGatePass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createGatePassService(
      req.body as ICreateGatePass,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getGatePasses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getGatePassesService(
      req.query as IGatePassesQuery,
      requester(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const approveGatePass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await approveGatePassService(
      req.params.id,
      req.body as IDecideGatePass,
      requester(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const declineGatePass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await declineGatePassService(
      req.params.id,
      req.body as IDecideGatePass,
      requester(req),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const carryOutGatePass = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await carryOutGatePassService(req.params.id, requester(req));
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

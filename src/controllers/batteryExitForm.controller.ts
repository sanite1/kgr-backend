import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getFleetRosterService,
  createExitFormService,
  getExitFormsService,
  getExitFormService,
} from "../services/batteryExitForm.service";
import {
  ICreateExitForm,
  IExitFormsQuery,
} from "../interfaces/batteryExitForm.interface";

export const getFleetRoster = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getFleetRosterService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createExitForm = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createExitFormService(
      req.body as ICreateExitForm,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getExitForms = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getExitFormsService(req.query as IExitFormsQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getExitForm = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getExitFormService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

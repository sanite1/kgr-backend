import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createBatteryService,
  getBatteriesService,
  getBatterySummaryService,
  getIdleBatteriesService,
  updateBatteryService,
  issueBatteryService,
  collectBatteryService,
  setBatteryStatusService,
  getBatteryMovementsService,
} from "../services/battery.service";
import {
  ICreateBattery,
  IUpdateBattery,
  IIssueBattery,
  ICollectBattery,
  ISetBatteryStatus,
  IBatteriesQuery,
  IBatteryMovementsQuery,
} from "../interfaces/battery.interface";

export const createBattery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createBatteryService(
      req.body as ICreateBattery,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBatteries = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBatteriesService(req.query as IBatteriesQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBatterySummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBatterySummaryService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getIdleBatteries = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getIdleBatteriesService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateBattery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateBatteryService(
      req.params.id,
      req.body as IUpdateBattery,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const issueBattery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await issueBatteryService(
      req.params.id,
      req.body as IIssueBattery,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const collectBattery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await collectBatteryService(
      req.params.id,
      req.body as ICollectBattery,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const setBatteryStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await setBatteryStatusService(
      req.params.id,
      req.body as ISetBatteryStatus,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBatteryMovements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBatteryMovementsService(
      req.params.id,
      req.query as IBatteryMovementsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

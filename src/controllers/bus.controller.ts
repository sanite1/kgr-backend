import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createBusService,
  getBusesService,
  getBusMaintenanceService,
  getBusService,
  getBusPerformanceService,
  getBusTripsService,
  updateBusService,
} from "../services/bus.service";
import {
  ICreateBusRequest,
  IUpdateBusRequest,
  IBusesQuery,
  IBusPerformanceQuery,
  IBusTripsQuery,
} from "../interfaces/bus.interface";

export const createBus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createBusService(
      req.body as ICreateBusRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBuses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusesService(
      req.query as IBusesQuery,
      String(req.user?.role),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBusMaintenance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusMaintenanceService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBusPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusPerformanceService(
      req.query as IBusPerformanceQuery,
      String(req.user?.role),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getBusTrips = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBusTripsService(
      req.params.id,
      req.query as IBusTripsQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateBus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateBusService(
      req.params.id,
      req.body as IUpdateBusRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

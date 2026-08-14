import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getTrackersService,
  getTrackerSummaryService,
  createTrackerService,
  updateTrackerService,
  getTrackerUpdatesService,
  deleteTrackerService,
} from "../services/tracker.service";
import {
  ICreateTracker,
  IUpdateTracker,
  ITrackersQuery,
  ITrackerUpdatesQuery,
} from "../interfaces/tracker.interface";

export const getTrackers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTrackersService(req.query as ITrackersQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTrackerSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTrackerSummaryService();
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createTracker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createTrackerService(
      req.body as ICreateTracker,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateTracker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateTrackerService(
      req.params.id,
      req.body as IUpdateTracker,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getTrackerUpdates = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTrackerUpdatesService(
      req.params.id,
      req.query as ITrackerUpdatesQuery,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteTracker = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteTrackerService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

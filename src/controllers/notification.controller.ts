import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import ApiError from "../errors/apiError";
import { getNotificationCountsService } from "../services/notification.service";

export const getNotificationCounts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new ApiError(401, "Authentication required");
    sendResponse(res, await getNotificationCountsService(req.user));
  } catch (error) {
    next(error);
  }
};

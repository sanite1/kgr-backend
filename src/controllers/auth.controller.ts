import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import ApiError from "../errors/apiError";
import {
  loginService,
  refreshTokenService,
  getMeService,
  changePasswordService,
} from "../services/auth.service";
import {
  ILoginRequest,
  IRefreshRequest,
  IChangePasswordRequest,
} from "../interfaces/user.interface";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await loginService(req.body as ILoginRequest);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await refreshTokenService(req.body as IRefreshRequest);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new ApiError(401, "Authentication required");
    const result = await getMeService(req.user);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new ApiError(401, "Authentication required");
    const result = await changePasswordService(
      String(req.user._id),
      req.body as IChangePasswordRequest,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

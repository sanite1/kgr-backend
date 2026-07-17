import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  createUserService,
  getUsersService,
  getUserService,
  updateUserService,
} from "../services/user.service";
import {
  ICreateUserRequest,
  IUpdateUserRequest,
  IUsersQuery,
} from "../interfaces/user.interface";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createUserService(
      req.body as ICreateUserRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getUsersService(req.query as IUsersQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getUserService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateUserService(
      req.params.id,
      req.body as IUpdateUserRequest,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

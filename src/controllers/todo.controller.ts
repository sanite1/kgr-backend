import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../helpers/sendResponse";
import {
  getTodosService,
  createTodoService,
  updateTodoService,
  setTodoDoneService,
  snoozeTodoService,
  deleteTodoService,
} from "../services/todo.service";
import {
  ICreateTodo,
  IUpdateTodo,
  ITodosQuery,
  ISnoozeTodo,
} from "../interfaces/todo.interface";

export const getTodos = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getTodosService(req.query as ITodosQuery);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createTodo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createTodoService(
      req.body as ICreateTodo,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateTodo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await updateTodoService(
      req.params.id,
      req.body as IUpdateTodo,
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const markTodoDone = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await setTodoDoneService(
      req.params.id,
      true,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const reopenTodo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await setTodoDoneService(
      req.params.id,
      false,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const snoozeTodo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await snoozeTodoService(
      req.params.id,
      req.body as ISnoozeTodo,
      String(req.user?._id),
    );
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteTodo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteTodoService(req.params.id);
    sendResponse(res, result);
  } catch (error) {
    next(error);
  }
};

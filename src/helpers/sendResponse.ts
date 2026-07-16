import { Response } from "express";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";

export const sendResponse = <T>(
  res: Response,
  result: ApiResponse<T>,
): void => {
  const body: Record<string, unknown> = {
    message: result.message,
    data: result.data,
  };
  if (result instanceof PaginatedResponse) body.pagination = result.pagination;
  res.status(result.statusCode).json(body);
};

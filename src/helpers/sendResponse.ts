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
  // responses may carry extra top-level fields (e.g. board counts)
  const extra = (result as { extra?: Record<string, unknown> }).extra;
  if (extra) Object.assign(body, extra);
  res.status(result.statusCode).json(body);
};

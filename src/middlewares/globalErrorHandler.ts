import { NextFunction, Request, Response } from "express";
import { ValidationError } from "express-validation";
import logger from "../config/logger";

interface CustomError extends Error {
  [key: string]: any;
}

export const globalErrorHandler = (
  error: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = error?.statusCode || 500;
  let message = error?.message || "Internal Server Error";
  let fields: { message: string; path: string | number }[] = [];

  if (error instanceof ValidationError) {
    statusCode = 400;
    message = "Validation Failed";
    if (error.details.body)
      fields = [
        ...fields,
        ...error.details.body.map((v) => ({
          message: v.message,
          path: v.path[0],
        })),
      ];
    if (error.details.params)
      fields = [
        ...fields,
        ...error.details.params.map((v) => ({
          message: v.message,
          path: v.path[0],
        })),
      ];
    if (error.details.query)
      fields = [
        ...fields,
        ...error.details.query.map((v) => ({
          message: v.message,
          path: v.path[0],
        })),
      ];
  }
  if (error.name === "ValidationError" && error.errors) {
    statusCode = 400;
    message = "Validation Failed";
    fields = [
      ...fields,
      ...Object.entries(error.errors).map(([key, value]: any) => ({
        path: key,
        message:
          value?.properties?.message || value?.message || "Invalid value",
      })),
    ];
  }
  if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for ${error.path}: ${error.value}`;
  }
  if (error.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(error.keyValue || {})[0];
    message = `Duplicate value for field: ${duplicateField}`;
  }
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  if (statusCode >= 500)
    logger.error(message, { statusCode, stack: error.stack, name: error.name });
  else
    logger.warn(message, {
      statusCode,
      name: error.name,
      ...(fields.length > 0 && { fields }),
    });

  return res.status(statusCode).json({
    error: error.name,
    status: statusCode,
    message,
    ...(fields.length > 0 && { fields }),
  });
};

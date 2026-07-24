import { NextFunction, Request, Response } from "express";
import { ValidationError } from "express-validation";
import logger from "../config/logger";

interface CustomError extends Error {
  [key: string]: any;
}

// Turns raw Joi wording into something a person can act on:
//   "rows[16].mileageKm" must be <= 10000  ->  mileage km (row 17) must be <= 10000
const humanizeFieldMessage = (raw: string): string =>
  raw.replace(/"([^"]+)"/g, (_match, label: string) => {
    const indexed = label.match(/^(\w+)\[(\d+)\]\.?(.*)$/);
    let name = label;
    let suffix = "";
    if (indexed) {
      name = indexed[3] || indexed[1];
      suffix = ` (row ${Number(indexed[2]) + 1})`;
    }
    const words = name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[._]/g, " ")
      .toLowerCase();
    return words + suffix;
  });

// The generic "Validation Failed" tells the user nothing; lead with the
// first real problem so every client shows something actionable.
const composeValidationMessage = (
  fields: { message: string; path: string | number }[],
): string => {
  const first = fields[0]?.message || "Validation failed";
  const lead = first.charAt(0).toUpperCase() + first.slice(1);
  const extra = fields.length - 1;
  return extra > 0
    ? `${lead} (+${extra} more issue${extra === 1 ? "" : "s"})`
    : lead;
};

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
    fields = [
      ...fields,
      ...Object.entries(error.errors).map(([key, value]: any) => ({
        path: key,
        message:
          value?.properties?.message || value?.message || "Invalid value",
      })),
    ];
  }
  if (fields.length > 0) {
    fields = fields.map((f) => ({
      ...f,
      message: humanizeFieldMessage(f.message),
    }));
    message = composeValidationMessage(fields);
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

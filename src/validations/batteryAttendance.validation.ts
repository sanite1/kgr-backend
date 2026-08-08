import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

const timeOfDay = Joi.string().valid("morning", "afternoon", "night");

export const createAttendanceLogValidation = () =>
  validate(
    {
      body: Joi.object({
        rows: Joi.array()
          .items(
            Joi.object({
              batteryId: Joi.string().hex().length(24).required(),
              status: Joi.string().valid("seen", "missing").required(),
              timeOfDay: timeOfDay.required(),
              location: Joi.string().valid(...BATTERY_LOCATION_VALUES),
              lastSeen: Joi.string().max(300).allow(""),
            }),
          )
          .min(1)
          .max(1000)
          .required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const attendanceLogsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const attendanceCompareValidation = () =>
  validate(
    {
      query: Joi.object({
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const attendanceLogIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

const session = Joi.string().valid("morning", "afternoon", "night");
const register = Joi.string().valid("manager", "staff", "storekeeper");

export const markAttendanceValidation = () =>
  validate(
    {
      body: Joi.object({
        batteryId: Joi.string().hex().length(24).required(),
        session: session.required(),
        register: register.required(),
        status: Joi.string().valid("seen", "missing").required(),
        location: Joi.string().valid(...BATTERY_LOCATION_VALUES),
        lastSeen: Joi.string().max(120).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listAttendanceValidation = () =>
  validate(
    {
      query: Joi.object({
        session: session.required(),
        register: register.required(),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const attendanceCompareValidation = () =>
  validate(
    {
      query: Joi.object({
        session: session.required(),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const attendanceDaysValidation = () =>
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

export const attendanceEntryIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

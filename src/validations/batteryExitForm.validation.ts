import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

const CHECKS = ["active", "faulty", "needs_check", "out_of_use", "sold", "bms"];

export const createExitFormValidation = () =>
  validate(
    {
      body: Joi.object({
        date: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .messages({ "string.pattern.base": "date must be YYYY-MM-DD" }),
        comments: Joi.string().max(2000).allow(""),
        rows: Joi.array()
          .min(1)
          .max(1000)
          .items(
            Joi.object({
              batteryId: Joi.string().hex().length(24).required(),
              check: Joi.string()
                .valid(...CHECKS)
                .required(),
              location: Joi.string()
                .valid(...BATTERY_LOCATION_VALUES)
                .required(),
              note: Joi.string().max(500).allow(""),
            }),
          )
          .required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listExitFormsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const exitFormIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

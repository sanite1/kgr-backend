import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

export const createClosingEntryValidation = () =>
  validate(
    {
      body: Joi.object({
        batteryName: Joi.string().min(1).max(40).required(),
        percent: Joi.number().valid(50, 75, 100).required(),
        voltage: Joi.string()
          .pattern(/^\d+(\.\d{1,2})?$/)
          .required()
          .messages({
            "string.pattern.base": "voltage must be a figure like 81.7",
          }),
        location: Joi.string()
          .valid(...BATTERY_LOCATION_VALUES)
          .required(),
        trips: Joi.number().min(0).max(100).multiple(0.5),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listClosingEntriesValidation = () =>
  validate(
    {
      query: Joi.object({
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const closingDaysValidation = () =>
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

export const closingWorkedValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
      body: Joi.object({
        worked: Joi.boolean().required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const closingEntryIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

export const createHijetEntryValidation = () =>
  validate(
    {
      body: Joi.object({
        vehicleName: Joi.string().max(60).required(),
        batteryName: Joi.string().max(60).required(),
        timeOfDay: Joi.string().valid("morning", "afternoon", "night"),
        fromLocation: Joi.string().valid(...BATTERY_LOCATION_VALUES),
        trips: Joi.number().valid(1, 1.5, 2, 2.5, 3),
        note: Joi.string().max(300).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const hijetEntriesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        search: Joi.string().max(60).allow(""),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const hijetEntryIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

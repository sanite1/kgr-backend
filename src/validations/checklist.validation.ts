import { Joi, validate } from "express-validation";

export const createChecklistEntryValidation = () =>
  validate(
    {
      body: Joi.object({
        kind: Joi.string().valid("security", "admin").required(),
        busName: Joi.string().min(1).max(30).required(),
        session: Joi.string().valid("morning", "evening").required(),
        batteryName: Joi.string().min(1).max(40).required(),
        trips: Joi.number().valid(1, 1.5, 2, 2.5, 3).required().messages({
          "any.only": "trips must be 1, 1.5, 2, 2.5 or 3",
        }),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listChecklistValidation = () =>
  validate(
    {
      query: Joi.object({
        kind: Joi.string().valid("security", "admin").required(),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const checklistDaysValidation = () =>
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

export const checklistEntryIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

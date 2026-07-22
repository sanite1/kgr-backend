import { Joi, validate } from "express-validation";

export const createSwapValidation = () =>
  validate(
    {
      body: Joi.object({
        busId: Joi.string().hex().length(24).required(),
        initialBatteryId: Joi.string().hex().length(24).required(),
        suppliedBatteryId: Joi.string().hex().length(24).required(),
        tripsAdded: Joi.number().min(0).max(50).multiple(0.5).required(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listSwapsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        busId: Joi.string().hex().length(24),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

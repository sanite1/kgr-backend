import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const createBusValidation = () =>
  validate(
    {
      body: Joi.object({
        number: Joi.string().min(1).max(20).required(),
        driverName: Joi.string().max(200).allow(""),
        driverPhone: Joi.string().max(50).allow(""),
        notes: Joi.string().max(2000).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateBusValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        number: Joi.string().min(1).max(20),
        driverName: Joi.string().max(200).allow(""),
        driverPhone: Joi.string().max(50).allow(""),
        isActive: Joi.boolean(),
        hasTracker: Joi.boolean(),
        trackerHealth: Joi.string().valid("ok", "no_power", "no_data"),
        notes: Joi.string().max(2000).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const getBusValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

export const busPerformanceValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        isActive: Joi.string().valid("true", "false"),
        search: Joi.string().max(100).allow(""),
        from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        band: Joi.string().valid("all", "good", "average", "under", "idle"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const busTripsValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listBusesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        isActive: Joi.string().valid("true", "false"),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

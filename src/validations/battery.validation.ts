import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const STATUSES = [
  "active",
  "faulty",
  "charging",
  "fully_charged",
  "not_charged",
  "not_in_use",
];

export const createBatteryValidation = () =>
  validate(
    {
      body: Joi.object({
        code: Joi.string().min(2).max(30).required(),
        status: Joi.string().valid(...STATUSES),
        notes: Joi.string().max(1000).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateBatteryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        code: Joi.string().min(2).max(30),
        notes: Joi.string().max(1000).allow(""),
        isActive: Joi.boolean(),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const issueBatteryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        busId: Joi.string().hex().length(24).required(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const collectBatteryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const setBatteryStatusValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        to: Joi.string()
          .valid(...STATUSES)
          .required(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listBatteriesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid(...STATUSES),
        busId: Joi.string().hex().length(24),
        isActive: Joi.string().valid("true", "false"),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const batteryMovementsValidation = () =>
  validate(
    {
      params: idParam,
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

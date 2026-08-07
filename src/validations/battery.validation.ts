import { Joi, validate } from "express-validation";
import { BATTERY_LOCATION_VALUES } from "../config/batteryLocations";

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

const RETIRED_REASONS = [
  "sold",
  "dismantled",
  "accident",
  "bms_burnt",
  "other",
];

export const createBatteryValidation = () =>
  validate(
    {
      body: Joi.object({
        code: Joi.string().min(2).max(30).required(),
        status: Joi.string().valid(...STATUSES),
        location: Joi.string().valid(...BATTERY_LOCATION_VALUES),
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
        location: Joi.string().valid(...BATTERY_LOCATION_VALUES),
        needsCheck: Joi.boolean(),
        isActive: Joi.boolean(),
        retiredReason: Joi.string().valid(...RETIRED_REASONS),
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

export const batteryDetailsValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

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

export const snoozeBatteryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        // 0 wakes the pack up immediately; up to a month otherwise
        days: Joi.number().integer().min(0).max(31).required().messages({
          "number.max": "snooze can be at most a month (31 days)",
        }),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

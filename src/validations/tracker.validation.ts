import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const createTrackerValidation = () =>
  validate(
    {
      body: Joi.object({
        busId: Joi.string().hex().length(24),
        busName: Joi.string().max(60).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateTrackerValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        status: Joi.string().valid("online", "offline", "parked").required(),
        lastSeenText: Joi.string().max(60).required(),
        location: Joi.string().max(120).required(),
        purpose: Joi.string().max(200).allow(""),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const trackersQueryValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("online", "offline", "parked"),
        search: Joi.string().max(60).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const trackerIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

export const trackerUpdatesValidation = () =>
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

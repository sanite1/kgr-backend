import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const createReceiptValidation = () =>
  validate(
    {
      body: Joi.object({
        busId: Joi.string().hex().length(24).required(),
        batteryName: Joi.string().trim().min(1).max(50).required(),
        batteryPercent: Joi.number().integer().min(0).max(200).required(),
        voltage: Joi.number().min(0).max(1000),
        timeOut: Joi.string()
          .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
          .required(),
        expectedTrips: Joi.number().integer().min(1).max(50).required(),
        checkIn: Joi.boolean(),
        allowDuplicate: Joi.boolean(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listReceiptsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("awaiting_payment", "paid", "void"),
        busId: Joi.string().hex().length(24),
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
        search: Joi.string().max(50).allow(""),
        sort: Joi.string().valid("newest", "oldest"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const receiptIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

export const voidReceiptValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        reason: Joi.string().min(3).max(500).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const receiptSummaryValidation = () =>
  validate(
    {
      query: Joi.object({
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

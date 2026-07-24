import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const STATUSES = ["purchased", "shipping", "arrived", "delivered"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createPurchaseValidation = () =>
  validate(
    {
      body: Joi.object({
        title: Joi.string().min(2).max(300).required(),
        supplier: Joi.string().max(200).allow(""),
        quantity: Joi.number().integer().min(1).max(1000000),
        trackingNumber: Joi.string().max(120).allow(""),
        expectedArrival: Joi.string().pattern(DATE_RE).allow("").messages({
          "string.pattern.base": "expected arrival must be a date",
        }),
        notes: Joi.string().max(2000).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updatePurchaseValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        trackingNumber: Joi.string().max(120).allow(""),
        expectedArrival: Joi.string().pattern(DATE_RE).allow(""),
        notes: Joi.string().max(2000).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const setPurchaseStatusValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        status: Joi.string()
          .valid(...STATUSES)
          .required(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listPurchasesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid(...STATUSES),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

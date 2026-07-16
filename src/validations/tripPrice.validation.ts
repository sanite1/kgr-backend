import { Joi, validate } from "express-validation";

export const setTripPriceValidation = () =>
  validate(
    {
      body: Joi.object({
        amount: Joi.string()
          .pattern(/^\d+(\.\d{1,2})?$/)
          .required()
          .messages({
            "string.pattern.base":
              '"amount" must be a plain number string like "7500"',
          }),
        effectiveFrom: Joi.date().iso(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const tripPriceHistoryValidation = () =>
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

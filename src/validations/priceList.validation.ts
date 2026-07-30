import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const createPriceItemValidation = () =>
  validate(
    {
      body: Joi.object({
        name: Joi.string().min(1).max(100).required(),
        weight: Joi.string().max(30).allow(""),
        usd: Joi.number().min(0).max(1000000).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updatePriceItemValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        name: Joi.string().min(1).max(100),
        weight: Joi.string().max(30).allow(""),
        usd: Joi.number().min(0).max(1000000),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const updatePriceSettingsValidation = () =>
  validate(
    {
      body: Joi.object({
        rate: Joi.number().min(1).max(100000),
        notes: Joi.string().max(2000).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const priceItemIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

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
        notes: Joi.string().max(2000).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const getBusValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

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

import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const moneyPattern = /^\d+(\.\d{1,2})?$/;

const partLine = Joi.object({
  itemId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).max(1000).required(),
});

export const createRepairJobValidation = () =>
  validate(
    {
      body: Joi.object({
        title: Joi.string().min(3).max(200).required(),
        description: Joi.string().max(2000).allow(""),
        busId: Joi.string().hex().length(24),
        batteryId: Joi.string().hex().length(24),
        parts: Joi.array().items(partLine).max(50),
      }).or("busId", "batteryId"),
    },
    { context: true },
    { abortEarly: false },
  );

export const addRepairPartValidation = () =>
  validate(
    {
      params: idParam,
      body: partLine,
    },
    { context: true },
    { abortEarly: false },
  );

export const completeRepairJobValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        laborCost: Joi.string().pattern(moneyPattern),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const cancelRepairJobValidation = () =>
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

export const listRepairJobsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("open", "completed", "cancelled"),
        busId: Joi.string().hex().length(24),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

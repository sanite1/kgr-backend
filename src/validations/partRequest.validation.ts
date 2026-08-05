import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export const createPartRequestValidation = () =>
  validate(
    {
      body: Joi.object({
        busId: Joi.string().hex().length(24),
        target: Joi.string().min(1).max(60),
        itemId: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).max(1000).required(),
        narration: Joi.string().max(2000).allow(""),
        nextRequestDate: Joi.string().pattern(dayPattern),
        allowOverride: Joi.boolean(),
      })
        .xor("busId", "target")
        .messages({
          "object.missing": "pick a bus or type what the request is for",
          "object.xor": "pick a bus or type a target, not both",
        }),
    },
    { context: true },
    { abortEarly: false },
  );

export const decideRequestValidation = () =>
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

export const listPartRequestsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("pending", "approved", "declined"),
        busId: Joi.string().hex().length(24),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const busExpenseValidation = () =>
  validate(
    {
      query: Joi.object({
        from: Joi.string().pattern(dayPattern),
        to: Joi.string().pattern(dayPattern),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

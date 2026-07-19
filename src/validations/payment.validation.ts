import { Joi, validate } from "express-validation";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export const payReceiptValidation = () =>
  validate(
    {
      body: Joi.object({
        receiptId: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listPaymentsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        date: Joi.string().pattern(dayPattern),
        collectedBy: Joi.string().max(30),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const dailyAccountValidation = () =>
  validate(
    {
      query: Joi.object({
        date: Joi.string().pattern(dayPattern),
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const exportPaymentsValidation = () =>
  validate(
    {
      query: Joi.object({
        date: Joi.string().pattern(dayPattern),
        collectedBy: Joi.string().max(30),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

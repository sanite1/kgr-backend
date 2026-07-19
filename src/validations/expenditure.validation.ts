import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const moneyPattern = /^\d+(\.\d{1,2})?$/;

export const createCategoryValidation = () =>
  validate(
    {
      body: Joi.object({ name: Joi.string().trim().min(2).max(60).required() }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateCategoryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        name: Joi.string().trim().min(2).max(60),
        isActive: Joi.boolean(),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const createExpenditureValidation = () =>
  validate(
    {
      body: Joi.object({
        date: Joi.string().pattern(dayPattern),
        amount: Joi.string().pattern(moneyPattern).required(),
        categoryId: Joi.string().hex().length(24),
        categoryName: Joi.string().trim().min(2).max(60),
        busId: Joi.string().hex().length(24),
        description: Joi.string().trim().min(2).max(200).required(),
        note: Joi.string().max(1000).allow(""),
      }).or("categoryId", "categoryName"),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateExpenditureValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        date: Joi.string().pattern(dayPattern),
        amount: Joi.string().pattern(moneyPattern),
        categoryId: Joi.string().hex().length(24),
        busId: Joi.string().hex().length(24).allow(null, ""),
        description: Joi.string().trim().min(2).max(200),
        note: Joi.string().max(1000).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const listExpendituresValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        busId: Joi.string().hex().length(24),
        categoryId: Joi.string().hex().length(24),
        from: Joi.string().pattern(dayPattern),
        to: Joi.string().pattern(dayPattern),
        search: Joi.string().max(100).allow(""),
        status: Joi.string().valid("completed", "pending", "cancelled"),
        source: Joi.string().valid("manual", "part_request", "repair"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const expenditureSummaryValidation = () =>
  validate(
    {
      query: Joi.object({
        from: Joi.string().pattern(dayPattern),
        to: Joi.string().pattern(dayPattern),
        busId: Joi.string().hex().length(24),
        categoryId: Joi.string().hex().length(24),
        search: Joi.string().max(100).allow(""),
        status: Joi.string().valid("completed", "pending", "cancelled"),
        source: Joi.string().valid("manual", "part_request", "repair"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

import { Joi, validate } from "express-validation";

const idParam = Joi.object({ id: Joi.string().hex().length(24).required() });
const ymd = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const ym = Joi.string().pattern(/^\d{4}-\d{2}$/);

export const createFinanceEntryValidation = () =>
  validate(
    {
      body: Joi.object({
        kind: Joi.string()
          .valid("investment", "loan", "repayment", "salary", "other_debt")
          .required(),
        amount: Joi.number().positive().required(),
        date: ymd,
        month: ym,
        label: Joi.string().max(120).allow(""),
        note: Joi.string().max(500).allow(""),
        loanId: Joi.string().hex().length(24),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const buyDownValidation = () =>
  validate(
    {
      body: Joi.object({
        month: ym.required(),
        percent: Joi.number().min(1).max(100).required(),
        loanId: Joi.string().hex().length(24),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const financeEntriesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        kind: Joi.string().valid(
          "investment",
          "loan",
          "repayment",
          "salary",
          "other_debt",
        ),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const financeMonthsValidation = () =>
  validate(
    {
      query: Joi.object({ limit: Joi.number().integer().min(1).max(36) }),
    },
    { context: true },
    { abortEarly: false },
  );

export const financeSeriesValidation = () =>
  validate(
    {
      query: Joi.object({
        range: Joi.string().valid("daily", "weekly", "monthly", "yearly"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const financeEntryIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

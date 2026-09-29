import { Joi, validate } from "express-validation";

const idParam = Joi.object({ id: Joi.string().hex().length(24).required() });
const ymd = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const ym = Joi.string().pattern(/^\d{4}-\d{2}$/);
const hexId = Joi.string().hex().length(24);

const entryFields = {
  type: Joi.string().valid("expense", "income"),
  date: ymd,
  title: Joi.string().max(160),
  amount: Joi.number().min(0),
  quantity: Joi.number().min(0).allow(null),
  unitPrice: Joi.number().min(0).allow(null),
  usdAmount: Joi.number().min(0).allow(null),
  categoryId: hexId.allow("", null),
  accountId: hexId.allow("", null),
  note: Joi.string().max(500).allow(""),
  recurring: Joi.boolean(),
};

export const createMoneyBookEntryValidation = () =>
  validate(
    {
      body: Joi.object({
        ...entryFields,
        type: entryFields.type.required(),
        date: entryFields.date.required(),
        title: entryFields.title.required(),
        amount: entryFields.amount.required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateMoneyBookEntryValidation = () =>
  validate(
    { params: idParam, body: Joi.object(entryFields).min(1) },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookMonthValidation = () =>
  validate(
    { query: Joi.object({ month: ym }) },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookEntriesValidation = () =>
  validate(
    {
      query: Joi.object({
        month: ym,
        search: Joi.string().max(80).allow(""),
        categoryId: hexId,
        accountId: hexId,
        type: Joi.string().valid("expense", "income"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookReportsValidation = () =>
  validate(
    {
      query: Joi.object({
        month: ym,
        months: Joi.number().integer().min(3).max(24),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookCategoryValidation = () =>
  validate(
    {
      body: Joi.object({
        name: Joi.string().max(60).required(),
        color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
        monthlyBudget: Joi.number().min(0).allow(null),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateMoneyBookCategoryValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        name: Joi.string().max(60),
        color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
        monthlyBudget: Joi.number().min(0).allow(null),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookAccountValidation = () =>
  validate(
    { body: Joi.object({ name: Joi.string().max(60).required() }) },
    { context: true },
    { abortEarly: false },
  );

export const moneyBookIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

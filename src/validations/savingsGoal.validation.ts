import { Joi, validate } from "express-validation";

const objectId = Joi.string().hex().length(24).required();
const day = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const goalFields = {
  name: Joi.string().max(120),
  dailyAmount: Joi.number().min(0),
  ratePct: Joi.number().min(0).max(100),
  months: Joi.number().integer().min(1).max(600),
  startDate: day,
  account: Joi.string().max(120).allow(""),
  note: Joi.string().max(500).allow(""),
};

export const createGoalValidation = () =>
  validate(
    {
      body: Joi.object({
        ...goalFields,
        name: goalFields.name.required(),
        dailyAmount: goalFields.dailyAmount.required(),
        ratePct: goalFields.ratePct.required(),
        months: goalFields.months.required(),
        startDate: goalFields.startDate.required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateGoalValidation = () =>
  validate(
    {
      params: Joi.object({ id: objectId }),
      body: Joi.object({
        ...goalFields,
        status: Joi.string().valid("active", "reached", "archived"),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const goalIdValidation = () =>
  validate(
    { params: Joi.object({ id: objectId }) },
    { context: true },
    { abortEarly: false },
  );

const entryFields = {
  date: day,
  kind: Joi.string().valid("deposit", "interest", "withdrawal"),
  amount: Joi.number().min(0),
  note: Joi.string().max(300).allow(""),
};

export const createEntryValidation = () =>
  validate(
    {
      params: Joi.object({ id: objectId }),
      body: Joi.object({
        ...entryFields,
        date: entryFields.date.required(),
        kind: entryFields.kind.required(),
        amount: entryFields.amount.required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateEntryValidation = () =>
  validate(
    {
      params: Joi.object({ id: objectId, entryId: objectId }),
      body: Joi.object({
        ...entryFields,
        editNote: Joi.string().max(300).allow(""),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const entryIdValidation = () =>
  validate(
    { params: Joi.object({ id: objectId, entryId: objectId }) },
    { context: true },
    { abortEarly: false },
  );

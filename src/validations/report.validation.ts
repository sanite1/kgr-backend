import { Joi, validate } from "express-validation";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-\d{2}$/;

export const monthlyReportValidation = () =>
  validate(
    {
      query: Joi.object({
        month: Joi.string().pattern(monthPattern),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const expenseReportValidation = () =>
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

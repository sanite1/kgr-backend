import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const dueDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .allow("");

export const createTodoValidation = () =>
  validate(
    {
      body: Joi.object({
        title: Joi.string().min(1).max(200).required(),
        notes: Joi.string().max(1000).allow(""),
        dueDate,
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateTodoValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        title: Joi.string().min(1).max(200),
        notes: Joi.string().max(1000).allow(""),
        dueDate,
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const listTodosValidation = () =>
  validate(
    {
      query: Joi.object({
        view: Joi.string().valid(
          "all",
          "attention",
          "upcoming",
          "snoozed",
          "done",
        ),
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const snoozeTodoValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        days: Joi.number().integer().min(0).max(31).required().messages({
          "number.max": "snooze can be at most a month",
        }),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const todoIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

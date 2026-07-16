import { Joi, validate } from "express-validation";

export const createUserValidation = () =>
  validate(
    {
      body: Joi.object({
        firstName: Joi.string().min(2).max(100).required(),
        lastName: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(128).required(),
        role: Joi.string().valid("staff", "admin"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateUserValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
      body: Joi.object({
        firstName: Joi.string().min(2).max(100),
        lastName: Joi.string().min(2).max(100),
        role: Joi.string().valid("staff", "admin"),
        isActive: Joi.boolean(),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const getUserValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listUsersValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        role: Joi.string().valid("staff", "admin"),
        isActive: Joi.string().valid("true", "false"),
        search: Joi.string().max(200).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

import { Joi, validate } from "express-validation";

export const loginValidation = () =>
  validate(
    {
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const refreshValidation = () =>
  validate(
    {
      body: Joi.object({
        token: Joi.string().required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const changePasswordValidation = () =>
  validate(
    {
      body: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).max(128).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

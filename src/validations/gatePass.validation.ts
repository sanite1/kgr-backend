import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const createGatePassValidation = () =>
  validate(
    {
      body: Joi.object({
        department: Joi.string().min(2).max(120).required(),
        designation: Joi.string().max(120).allow(""),
        exitAt: Joi.string().min(2).max(120).required().messages({
          "any.required": "state the planned date and time of exit",
          "string.empty": "state the planned date and time of exit",
        }),
        items: Joi.array()
          .min(1)
          .max(20)
          .items(
            Joi.object({
              description: Joi.string().min(2).max(300).required(),
              quantity: Joi.number().integer().min(1).max(10000).required(),
              purpose: Joi.string().max(300).allow(""),
              location: Joi.string().max(200).allow(""),
            }),
          )
          .required()
          .messages({ "array.min": "add at least one item" }),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const decideGatePassValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        note: Joi.string().max(1000).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const clearGatePassItemValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
        index: Joi.number().integer().min(0).required(),
      }),
      body: Joi.object({
        outcome: Joi.string().valid("cleared", "flagged").required(),
        seenQuantity: Joi.number().integer().min(0).max(100000),
        note: Joi.string().max(300).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listGatePassesValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid(
          "pending",
          "approved",
          "declined",
          "carried_out",
        ),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

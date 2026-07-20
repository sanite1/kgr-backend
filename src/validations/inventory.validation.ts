import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});
const money = Joi.string().pattern(/^\d+(\.\d{1,2})?$/);

export const createItemValidation = () =>
  validate(
    {
      body: Joi.object({
        name: Joi.string().min(2).max(200).required(),
        category: Joi.string()
          .valid("part", "battery", "consumable", "solar", "conversion")
          .required(),
        unit: Joi.string().max(30).allow(""),
        quantityOnHand: Joi.number().integer().min(0),
        unitCost: money.required(),
        minLevel: Joi.number().integer().min(0),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateItemValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        name: Joi.string().min(2).max(200),
        category: Joi.string().valid(
          "part",
          "battery",
          "consumable",
          "solar",
          "conversion",
        ),
        unit: Joi.string().max(30).allow(""),
        unitCost: money,
        minLevel: Joi.number().integer().min(0),
        isActive: Joi.boolean(),
      }).min(1),
    },
    { context: true },
    { abortEarly: false },
  );

export const adjustStockValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        type: Joi.string().valid("in", "out", "adjust").required(),
        quantity: Joi.number().integer().min(0).required(),
        note: Joi.string().max(500).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listItemsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        category: Joi.string().valid(
          "part",
          "battery",
          "consumable",
          "solar",
          "conversion",
        ),
        isActive: Joi.string().valid("true", "false"),
        search: Joi.string().max(100).allow(""),
        lowStock: Joi.string().valid("true"),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listMovementsValidation = () =>
  validate(
    {
      params: idParam,
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

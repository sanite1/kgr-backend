import { Joi, validate } from "express-validation";

const idParam = Joi.object({ id: Joi.string().hex().length(24).required() });
const fields = {
  name: Joi.string().max(120),
  category: Joi.string().valid("appreciating", "depreciating"),
  quantity: Joi.number().min(0),
  currency: Joi.string().valid("USD", "NGN"),
  unitPrice: Joi.number().min(0),
  acquiredOn: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(""),
  note: Joi.string().max(500).allow(""),
};

export const createCompanyAssetValidation = () =>
  validate(
    {
      body: Joi.object({
        ...fields,
        name: fields.name.required(),
        category: fields.category.required(),
        quantity: fields.quantity.required(),
        currency: fields.currency.required(),
        unitPrice: fields.unitPrice.required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateCompanyAssetValidation = () =>
  validate(
    { params: idParam, body: Joi.object(fields).min(1) },
    { context: true },
    { abortEarly: false },
  );

export const companyAssetIdValidation = () =>
  validate({ params: idParam }, { context: true }, { abortEarly: false });

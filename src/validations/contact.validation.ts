import { Joi, validate } from "express-validation";

// Mirrors CONTACT_FORM_INTEGRATION.md exactly: name 2-200, valid email,
// message 1-5000, phone max 50, subject max 300, free-form metadata.
// Unknown top-level fields are rejected (they must ride inside metadata).
export const contactValidation = () =>
  validate(
    {
      params: Joi.object({
        companyId: Joi.string().hex().length(24).required(),
      }),
      body: Joi.object({
        name: Joi.string().min(2).max(200).required(),
        email: Joi.string().email().required(),
        message: Joi.string().min(1).max(5000).required(),
        phone: Joi.string().max(50).allow(""),
        subject: Joi.string().max(300).allow(""),
        metadata: Joi.object().pattern(Joi.string(), Joi.any()),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

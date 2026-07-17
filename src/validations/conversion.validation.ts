import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const submitConversionValidation = () =>
  validate(
    {
      body: Joi.object({
        name: Joi.string().min(2).max(200).required(),
        email: Joi.string().email().max(320).required(),
        phone: Joi.string().max(50).allow(""),
        remarks: Joi.string().max(5000).allow(""),
        sections: Joi.array()
          .items(
            Joi.object({
              title: Joi.string().max(200).required(),
              fields: Joi.array()
                .items(
                  Joi.object({
                    label: Joi.string().max(200).required(),
                    value: Joi.string().max(2000).allow(""),
                  }),
                )
                .max(60)
                .required(),
            }),
          )
          .max(20),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const updateConversionStatusValidation = () =>
  validate(
    {
      params: idParam,
      body: Joi.object({
        status: Joi.string()
          .valid("new", "in_review", "contacted", "closed")
          .required(),
        note: Joi.string().max(1000).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listConversionsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("new", "in_review", "contacted", "closed"),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

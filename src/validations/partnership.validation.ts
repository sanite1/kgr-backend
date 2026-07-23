import { Joi, validate } from "express-validation";

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const submitPartnershipValidation = () =>
  validate(
    {
      body: Joi.object({
        kind: Joi.string().valid("corporate", "individual").required(),
        name: Joi.string().min(2).max(200).required(),
        email: Joi.string().email().max(320).required(),
        phone: Joi.string().max(50).allow(""),
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

export const updatePartnershipStatusValidation = () =>
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

export const listPartnershipsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        status: Joi.string().valid("new", "in_review", "contacted", "closed"),
        kind: Joi.string().valid("corporate", "individual"),
        search: Joi.string().max(100).allow(""),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

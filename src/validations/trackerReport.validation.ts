import { Joi, validate } from "express-validation";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

export const parseTrackerValidation = () =>
  validate(
    {
      body: Joi.object({
        text: Joi.string().min(10).max(100000).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const createTrackerReportValidation = () =>
  validate(
    {
      body: Joi.object({
        date: Joi.string().pattern(DATE_RE).required().messages({
          "string.pattern.base": "date must be YYYY-MM-DD",
        }),
        replace: Joi.boolean(),
        rawText: Joi.string().max(100000).allow(""),
        notes: Joi.string().max(2000).allow(""),
        rows: Joi.array()
          .min(1)
          .max(500)
          .items(
            Joi.object({
              busId: Joi.string().hex().length(24),
              busNumber: Joi.string().min(1).max(30).required(),
              status: Joi.string().max(40).allow(""),
              startTime: Joi.string().pattern(TIME_RE).allow(""),
              endTime: Joi.string().pattern(TIME_RE).allow(""),
              mileageKm: Joi.number().min(0).max(10000).required(),
              note: Joi.string().max(500).allow(""),
            }),
          )
          .required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const listTrackerReportsValidation = () =>
  validate(
    {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        pageSize: Joi.number().integer().min(1).max(100),
        date: Joi.string().pattern(DATE_RE),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const trackerReportIdValidation = () =>
  validate(
    {
      params: Joi.object({
        id: Joi.string().hex().length(24).required(),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

export const mileageValidation = () =>
  validate(
    {
      query: Joi.object({
        month: Joi.string().pattern(/^\d{4}-\d{2}$/),
      }),
    },
    { context: true },
    { abortEarly: false },
  );

import { Router } from "express";
import { strictRateLimiter } from "../middlewares/rateLimiter";
import { contactValidation } from "../validations/contact.validation";
import { submitContact } from "../controllers/contact.controller";

const router = Router();

// public: no auth. 5 submissions per 15 minutes per IP.
router.post(
  "/:companyId",
  strictRateLimiter({
    prefix: "contact",
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    keyStrategy: "ip",
    message: "Too many messages. Please wait a while before sending another.",
  }),
  contactValidation(),
  submitContact,
);

export default router;

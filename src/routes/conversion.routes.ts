import { Router } from "express";
import { strictRateLimiter } from "../middlewares/rateLimiter";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import {
  submitConversionValidation,
  updateConversionStatusValidation,
  listConversionsValidation,
} from "../validations/conversion.validation";
import {
  submitConversion,
  getConversions,
  updateConversionStatus,
} from "../controllers/conversion.controller";

const router = Router();

// public: the website's conversion sheet. 3 submissions per 15 minutes
// per IP: the sheet is long, nobody legitimate sends more.
router.post(
  "/",
  strictRateLimiter({
    prefix: "conversion",
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
    keyStrategy: "ip",
    message: "Too many submissions. Please wait a while before trying again.",
  }),
  submitConversionValidation(),
  submitConversion,
);

// console side: business leads are manager territory
router.get(
  "/",
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  listConversionsValidation(),
  getConversions,
);
router.patch(
  "/:id/status",
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  updateConversionStatusValidation(),
  updateConversionStatus,
);

export default router;

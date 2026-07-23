import { Router } from "express";
import { strictRateLimiter } from "../middlewares/rateLimiter";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  submitPartnershipValidation,
  updatePartnershipStatusValidation,
  listPartnershipsValidation,
} from "../validations/partnership.validation";
import {
  submitPartnership,
  getPartnerships,
  updatePartnershipStatus,
} from "../controllers/partnership.controller";

const router = Router();

// public: the website's partner / investor form. 3 per 15 minutes per IP.
router.post(
  "/",
  strictRateLimiter({
    prefix: "partnership",
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
    keyStrategy: "ip",
    message: "Too many submissions. Please wait a while before trying again.",
  }),
  submitPartnershipValidation(),
  submitPartnership,
);

// console side: investor leads are manager territory
router.get(
  "/",
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("partnerships"),
  listPartnershipsValidation(),
  getPartnerships,
);
router.patch(
  "/:id/status",
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("partnerships"),
  updatePartnershipStatusValidation(),
  updatePartnershipStatus,
);

export default router;

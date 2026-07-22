import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  parseTrackerValidation,
  createTrackerReportValidation,
  listTrackerReportsValidation,
  trackerReportIdValidation,
  mileageValidation,
} from "../validations/trackerReport.validation";
import {
  parseTrackerText,
  createTrackerReport,
  getTrackerReports,
  getTrackerReport,
  getMileageSummary,
} from "../controllers/trackerReport.controller";

const router = Router();

router.use(isAuthenticated);

// keying in the day's report is staff work
router.post(
  "/parse",
  requireAccess("tracker_report"),
  parseTrackerValidation(),
  parseTrackerText,
);
router.post(
  "/",
  requireAccess("tracker_report"),
  createTrackerReportValidation(),
  createTrackerReport,
);

// history, detail and mileage analytics: management
router.get(
  "/mileage",
  authorizeRoles(...MANAGERS),
  mileageValidation(),
  getMileageSummary,
);
router.get(
  "/",
  authorizeRoles(...MANAGERS),
  listTrackerReportsValidation(),
  getTrackerReports,
);
router.get(
  "/:id",
  authorizeRoles(...MANAGERS),
  trackerReportIdValidation(),
  getTrackerReport,
);

export default router;

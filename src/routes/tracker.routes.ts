import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createTrackerValidation,
  updateTrackerValidation,
  trackersQueryValidation,
  trackerIdValidation,
  trackerUpdatesValidation,
} from "../validations/tracker.validation";
import {
  getTrackers,
  getTrackerSummary,
  createTracker,
  updateTracker,
  getTrackerUpdates,
  deleteTracker,
} from "../controllers/tracker.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("trackers"));

router.get("/summary", getTrackerSummary);
router.get("/", trackersQueryValidation(), getTrackers);
router.post("/", createTrackerValidation(), createTracker);
router.post("/:id/update", updateTrackerValidation(), updateTracker);
router.get("/:id/updates", trackerUpdatesValidation(), getTrackerUpdates);
router.delete(
  "/:id",
  authorizeRoles("admin"),
  trackerIdValidation(),
  deleteTracker,
);

export default router;

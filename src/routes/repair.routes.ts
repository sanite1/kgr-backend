import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, STORE } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createRepairJobValidation,
  addRepairPartValidation,
  completeRepairJobValidation,
  cancelRepairJobValidation,
  listRepairJobsValidation,
} from "../validations/repair.validation";
import {
  createRepairJob,
  getRepairJobs,
  addRepairPart,
  completeRepairJob,
  cancelRepairJob,
} from "../controllers/repair.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("repairs"));

router.get("/", listRepairJobsValidation(), getRepairJobs);
router.post(
  "/",
  authorizeRoles(...STORE),
  createRepairJobValidation(),
  createRepairJob,
);
router.post(
  "/:id/parts",
  authorizeRoles(...STORE),
  addRepairPartValidation(),
  addRepairPart,
);
// closing a job prices the labor / restocks parts: managers only
router.post(
  "/:id/complete",
  authorizeRoles(...MANAGERS),
  completeRepairJobValidation(),
  completeRepairJob,
);
router.post(
  "/:id/cancel",
  authorizeRoles(...MANAGERS),
  cancelRepairJobValidation(),
  cancelRepairJob,
);

export default router;

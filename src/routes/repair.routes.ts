import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
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

router.use(isAuthenticated);

router.get("/", listRepairJobsValidation(), getRepairJobs);
router.post("/", createRepairJobValidation(), createRepairJob);
router.post("/:id/parts", addRepairPartValidation(), addRepairPart);
// closing a job prices the labor / restocks parts: admin-only
router.post(
  "/:id/complete",
  authorizeRoles("admin"),
  completeRepairJobValidation(),
  completeRepairJob,
);
router.post(
  "/:id/cancel",
  authorizeRoles("admin"),
  cancelRepairJobValidation(),
  cancelRepairJob,
);

export default router;

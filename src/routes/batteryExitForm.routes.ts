import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createExitFormValidation,
  listExitFormsValidation,
  exitFormIdValidation,
} from "../validations/batteryExitForm.validation";
import {
  getFleetRoster,
  createExitForm,
  getExitForms,
  getExitForm,
} from "../controllers/batteryExitForm.controller";

const router = Router();

router.use(isAuthenticated);

// running the roll-call is staff work: any signed-in user may do it
router.get("/roster", requireAccess("battery_form"), getFleetRoster);
router.post(
  "/",
  requireAccess("battery_form"),
  createExitFormValidation(),
  createExitForm,
);

// the submitted records and their per-pack detail are admin-only
router.get(
  "/",
  authorizeRoles("admin"),
  listExitFormsValidation(),
  getExitForms,
);
router.get(
  "/:id",
  authorizeRoles("admin"),
  exitFormIdValidation(),
  getExitForm,
);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createChecklistEntryValidation,
  listChecklistValidation,
  checklistCompareValidation,
  checklistDaysValidation,
  checklistEntryIdValidation,
} from "../validations/checklist.validation";
import {
  createChecklistEntry,
  getChecklist,
  getChecklistCompare,
  getChecklistDays,
  deleteChecklistEntry,
} from "../controllers/checklist.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("checklists"));

// static paths before param paths; past-days overview is management's
router.get(
  "/days",
  authorizeRoles(...MANAGERS),
  checklistDaysValidation(),
  getChecklistDays,
);
// the side by side comparison of the two lists is management's view
router.get(
  "/compare",
  authorizeRoles(...MANAGERS),
  checklistCompareValidation(),
  getChecklistCompare,
);
router.get("/", listChecklistValidation(), getChecklist);
router.post("/", createChecklistEntryValidation(), createChecklistEntry);
router.delete("/:id", checklistEntryIdValidation(), deleteChecklistEntry);

export default router;

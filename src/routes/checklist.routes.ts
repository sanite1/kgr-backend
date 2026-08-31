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
  updateChecklistEntryValidation,
} from "../validations/checklist.validation";
import {
  createChecklistEntry,
  getChecklist,
  getChecklistCompare,
  getChecklistReceiptsCompare,
  getChecklistDays,
  deleteChecklistEntry,
  updateChecklistEntry,
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
// the checklists against the day's receipts: management's view too
router.get(
  "/compare-receipts",
  authorizeRoles(...MANAGERS),
  checklistCompareValidation(),
  getChecklistReceiptsCompare,
);
router.get("/", listChecklistValidation(), getChecklist);
router.post("/", createChecklistEntryValidation(), createChecklistEntry);
// corrections are the admin's pen alone, and every stroke is recorded
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateChecklistEntryValidation(),
  updateChecklistEntry,
);
router.delete("/:id", checklistEntryIdValidation(), deleteChecklistEntry);

export default router;

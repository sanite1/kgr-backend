import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createGoalValidation,
  updateGoalValidation,
  goalIdValidation,
  createEntryValidation,
  updateEntryValidation,
  entryIdValidation,
} from "../validations/savingsGoal.validation";
import {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../controllers/savingsGoal.controller";

const router = Router();

// the company's savings targets: management only
router.use(
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("goal_tracker"),
);

router.get("/", listGoals);
router.post("/", createGoalValidation(), createGoal);
router.get("/:id", goalIdValidation(), getGoal);
router.patch("/:id", updateGoalValidation(), updateGoal);
router.delete("/:id", goalIdValidation(), deleteGoal);
router.post("/:id/entries", createEntryValidation(), createEntry);
router.patch("/:id/entries/:entryId", updateEntryValidation(), updateEntry);
router.delete("/:id/entries/:entryId", entryIdValidation(), deleteEntry);

export default router;

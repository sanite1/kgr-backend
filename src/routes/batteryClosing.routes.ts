import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createClosingEntryValidation,
  listClosingEntriesValidation,
  closingDaysValidation,
  closingEntryIdValidation,
} from "../validations/batteryClosing.validation";
import {
  createClosingEntry,
  getClosingEntries,
  getClosingDays,
  deleteClosingEntry,
} from "../controllers/batteryClosing.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("battery_closing"));

// static paths before param paths; past-days overview is management's
router.get(
  "/days",
  authorizeRoles(...MANAGERS),
  closingDaysValidation(),
  getClosingDays,
);
router.get("/", listClosingEntriesValidation(), getClosingEntries);
router.post("/", createClosingEntryValidation(), createClosingEntry);
router.delete("/:id", closingEntryIdValidation(), deleteClosingEntry);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createClosingEntryValidation,
  listClosingEntriesValidation,
  closingDaysValidation,
  closingWorkedValidation,
  closingEntryIdValidation,
} from "../validations/batteryClosing.validation";
import { makeClosingControllers } from "../controllers/batteryClosing.controller";

// The Muh'd & Kamila house closing sheet: same format as the main yard
// battery closing, its own list and its own access toggle so different
// people take this report.
const {
  createClosingEntry,
  getClosingEntries,
  getClosingDays,
  markClosingWorked,
  deleteClosingEntry,
} = makeClosingControllers("muhd_kamila");

const router = Router();

router.use(isAuthenticated, requireAccess("house_closing"));

// static paths before param paths; past-days overview is management's
router.get(
  "/days",
  authorizeRoles(...MANAGERS),
  closingDaysValidation(),
  getClosingDays,
);
router.get("/", listClosingEntriesValidation(), getClosingEntries);
router.post("/", createClosingEntryValidation(), createClosingEntry);
router.post("/:id/worked", closingWorkedValidation(), markClosingWorked);
router.delete("/:id", closingEntryIdValidation(), deleteClosingEntry);

export default router;

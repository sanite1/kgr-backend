import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createFinanceEntryValidation,
  buyDownValidation,
  financeEntriesValidation,
  financeMonthsValidation,
  financeSeriesValidation,
  financeEntryIdValidation,
} from "../validations/finance.validation";
import {
  getFinanceOverview,
  getFinanceMonths,
  getFinanceEntries,
  createFinanceEntry,
  buyDown,
  deleteFinanceEntry,
  getFinanceSeries,
} from "../controllers/finance.controller";

const router = Router();

// the money behind the business is the admin's alone
router.use(isAuthenticated, authorizeRoles("admin"), requireAccess("finance"));

router.get("/overview", getFinanceOverview);
router.get("/months", financeMonthsValidation(), getFinanceMonths);
router.get("/series", financeSeriesValidation(), getFinanceSeries);
router.get("/entries", financeEntriesValidation(), getFinanceEntries);
router.post("/entries", createFinanceEntryValidation(), createFinanceEntry);
router.post("/buy-down", buyDownValidation(), buyDown);
router.delete("/entries/:id", financeEntryIdValidation(), deleteFinanceEntry);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  monthlyReportValidation,
  expenseReportValidation,
} from "../validations/report.validation";
import {
  getMonthlyReport,
  getExpenseReport,
} from "../controllers/report.controller";

const router = Router();

// whole-business money views: managers and admin
router.use(
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("reports"),
);

router.get("/monthly", monthlyReportValidation(), getMonthlyReport);
router.get("/expenses", expenseReportValidation(), getExpenseReport);

export default router;

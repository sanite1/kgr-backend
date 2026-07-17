import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import {
  monthlyReportValidation,
  expenseReportValidation,
} from "../validations/report.validation";
import {
  getMonthlyReport,
  getExpenseReport,
} from "../controllers/report.controller";

const router = Router();

// whole-business money views: admin-only
router.use(isAuthenticated, authorizeRoles("admin"));

router.get("/monthly", monthlyReportValidation(), getMonthlyReport);
router.get("/expenses", expenseReportValidation(), getExpenseReport);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, FRONT_DESK } from "../config/roles";
import {
  payReceiptValidation,
  listPaymentsValidation,
  dailyAccountValidation,
  exportPaymentsValidation,
} from "../validations/payment.validation";
import {
  payReceipt,
  getPayments,
  getDailyAccount,
  exportPayments,
} from "../controllers/payment.controller";

const router = Router();

router.use(isAuthenticated);

// static paths before param paths
// the reconciliation view compares every cashier: managers only
router.get(
  "/daily-account",
  authorizeRoles(...MANAGERS),
  dailyAccountValidation(),
  getDailyAccount,
);
router.get(
  "/export",
  authorizeRoles(...FRONT_DESK),
  exportPaymentsValidation(),
  exportPayments,
);
router.get("/", listPaymentsValidation(), getPayments);
router.post(
  "/",
  authorizeRoles(...FRONT_DESK),
  payReceiptValidation(),
  payReceipt,
);

export default router;

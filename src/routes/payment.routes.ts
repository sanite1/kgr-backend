import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
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
router.get("/daily-account", dailyAccountValidation(), getDailyAccount);
router.get("/export", exportPaymentsValidation(), exportPayments);
router.get("/", listPaymentsValidation(), getPayments);
router.post("/", payReceiptValidation(), payReceipt);

export default router;

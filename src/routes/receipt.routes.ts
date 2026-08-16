import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, FRONT_DESK } from "../config/roles";
import {
  createReceiptValidation,
  listReceiptsValidation,
  receiptIdValidation,
  voidReceiptValidation,
  receiptSummaryValidation,
} from "../validations/receipt.validation";
import {
  createReceipt,
  getReceipts,
  getReceipt,
  checkInReceipt,
  voidReceipt,
  getReceiptSummary,
  getReceiptSeries,
  getOutstandingSummary,
} from "../controllers/receipt.controller";

const router = Router();

router.use(isAuthenticated);

// static paths before param paths
router.get("/summary", receiptSummaryValidation(), getReceiptSummary);
router.get("/series", authorizeRoles("admin"), getReceiptSeries);
router.get("/outstanding-summary", getOutstandingSummary);
router.get("/", listReceiptsValidation(), getReceipts);
// issuing and checking in are front desk work
router.post(
  "/",
  authorizeRoles(...FRONT_DESK),
  createReceiptValidation(),
  createReceipt,
);
router.get("/:id", receiptIdValidation(), getReceipt);
router.post(
  "/:id/check-in",
  authorizeRoles(...FRONT_DESK),
  receiptIdValidation(),
  checkInReceipt,
);
// voiding a receipt needs a manager and always carries a reason
router.post(
  "/:id/void",
  authorizeRoles(...MANAGERS),
  voidReceiptValidation(),
  voidReceipt,
);

export default router;

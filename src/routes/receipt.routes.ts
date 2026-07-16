import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
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
  getOutstandingSummary,
} from "../controllers/receipt.controller";

const router = Router();

router.use(isAuthenticated);

// static paths before param paths
router.get("/summary", receiptSummaryValidation(), getReceiptSummary);
router.get("/outstanding-summary", getOutstandingSummary);
router.get("/", listReceiptsValidation(), getReceipts);
router.post("/", createReceiptValidation(), createReceipt);
router.get("/:id", receiptIdValidation(), getReceipt);
router.post("/:id/check-in", receiptIdValidation(), checkInReceipt);
// voiding a receipt is admin-only and always carries a reason
router.post(
  "/:id/void",
  authorizeRoles("admin"),
  voidReceiptValidation(),
  voidReceipt,
);

export default router;

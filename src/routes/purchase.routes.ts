import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createPurchaseValidation,
  updatePurchaseValidation,
  setPurchaseStatusValidation,
  listPurchasesValidation,
} from "../validations/purchase.validation";
import {
  createPurchase,
  getPurchases,
  updatePurchase,
  setPurchaseStatus,
} from "../controllers/purchase.controller";

const router = Router();

// tracking foreign orders is company-staff work end to end
router.use(isAuthenticated, requireAccess("purchases"));

router.get("/", listPurchasesValidation(), getPurchases);
router.post("/", createPurchaseValidation(), createPurchase);
router.patch("/:id", updatePurchaseValidation(), updatePurchase);
router.post("/:id/status", setPurchaseStatusValidation(), setPurchaseStatus);

export default router;

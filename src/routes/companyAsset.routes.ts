import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createCompanyAssetValidation,
  updateCompanyAssetValidation,
  companyAssetIdValidation,
} from "../validations/companyAsset.validation";
import {
  getCompanyAssets,
  createCompanyAsset,
  updateCompanyAsset,
  deleteCompanyAsset,
} from "../controllers/companyAsset.controller";

const router = Router();

// a valuation of the company: management's view and management's pen
router.use(
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("assets"),
);

router.get("/", getCompanyAssets);
router.post("/", createCompanyAssetValidation(), createCompanyAsset);
router.patch("/:id", updateCompanyAssetValidation(), updateCompanyAsset);
router.delete("/:id", companyAssetIdValidation(), deleteCompanyAsset);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createPriceItemValidation,
  updatePriceItemValidation,
  updatePriceSettingsValidation,
  priceItemIdValidation,
} from "../validations/priceList.validation";
import {
  getPriceList,
  createPriceItem,
  updatePriceItem,
  deletePriceItem,
  updatePriceSettings,
} from "../controllers/priceList.controller";

const router = Router();

// its own tab and its own access toggle; changing prices or the rate
// is management's work
router.use(isAuthenticated, requireAccess("price_list"));

router.get("/", getPriceList);
router.post(
  "/items",
  authorizeRoles(...MANAGERS),
  createPriceItemValidation(),
  createPriceItem,
);
router.patch(
  "/items/:id",
  authorizeRoles(...MANAGERS),
  updatePriceItemValidation(),
  updatePriceItem,
);
router.delete(
  "/items/:id",
  authorizeRoles(...MANAGERS),
  priceItemIdValidation(),
  deletePriceItem,
);
router.patch(
  "/settings",
  authorizeRoles(...MANAGERS),
  updatePriceSettingsValidation(),
  updatePriceSettings,
);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { STORE } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createItemValidation,
  updateItemValidation,
  adjustStockValidation,
  listItemsValidation,
  listMovementsValidation,
} from "../validations/warehouse.validation";
import {
  createWarehouseItem,
  getWarehouseItems,
  updateWarehouseItem,
  adjustWarehouseStock,
  getWarehouseMovements,
} from "../controllers/warehouse.controller";

const router = Router();

router.use(isAuthenticated);

// everyone signed in can see warehouse stock; changing it is store work
router.get("/", listItemsValidation(), getWarehouseItems);
router.post(
  "/",
  authorizeRoles(...STORE),
  requireAccess("warehouse"),
  createItemValidation(),
  createWarehouseItem,
);
router.patch(
  "/:id",
  authorizeRoles(...STORE),
  requireAccess("warehouse"),
  updateItemValidation(),
  updateWarehouseItem,
);
router.post(
  "/:id/adjust",
  authorizeRoles(...STORE),
  requireAccess("warehouse"),
  adjustStockValidation(),
  adjustWarehouseStock,
);
router.get("/:id/movements", listMovementsValidation(), getWarehouseMovements);

export default router;

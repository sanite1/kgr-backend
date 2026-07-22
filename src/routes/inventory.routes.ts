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
} from "../validations/inventory.validation";
import {
  createItem,
  getItems,
  updateItem,
  adjustStock,
  getMovements,
} from "../controllers/inventory.controller";

const router = Router();

router.use(isAuthenticated);

// everyone signed in can see stock; changing it is store work
router.get("/", listItemsValidation(), getItems);
router.post(
  "/",
  authorizeRoles(...STORE),
  requireAccess("inventory"),
  createItemValidation(),
  createItem,
);
router.patch(
  "/:id",
  authorizeRoles(...STORE),
  requireAccess("inventory"),
  updateItemValidation(),
  updateItem,
);
router.post(
  "/:id/adjust",
  authorizeRoles(...STORE),
  requireAccess("inventory"),
  adjustStockValidation(),
  adjustStock,
);
router.get("/:id/movements", listMovementsValidation(), getMovements);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
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

// everyone signed in can see stock; changing it is admin-only
router.get("/", listItemsValidation(), getItems);
router.post("/", authorizeRoles("admin"), createItemValidation(), createItem);
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateItemValidation(),
  updateItem,
);
router.post(
  "/:id/adjust",
  authorizeRoles("admin"),
  adjustStockValidation(),
  adjustStock,
);
router.get("/:id/movements", listMovementsValidation(), getMovements);

export default router;

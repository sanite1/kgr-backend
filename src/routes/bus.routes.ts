import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import {
  createBusValidation,
  updateBusValidation,
  getBusValidation,
  listBusesValidation,
} from "../validations/bus.validation";
import {
  createBus,
  getBuses,
  getBus,
  updateBus,
} from "../controllers/bus.controller";

const router = Router();

router.use(isAuthenticated);

// any signed-in staff can view and quick-add buses (needed at receipt time);
// edits and deactivation are admin-only
router.get("/", listBusesValidation(), getBuses);
router.post("/", createBusValidation(), createBus);
router.get("/:id", getBusValidation(), getBus);
router.patch("/:id", authorizeRoles("admin"), updateBusValidation(), updateBus);

export default router;

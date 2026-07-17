import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, FRONT_DESK } from "../config/roles";
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

// everyone can view; the front desk can quick-add a bus at receipt
// time; edits and deactivation need a manager
router.get("/", listBusesValidation(), getBuses);
router.post(
  "/",
  authorizeRoles(...FRONT_DESK),
  createBusValidation(),
  createBus,
);
router.get("/:id", getBusValidation(), getBus);
router.patch(
  "/:id",
  authorizeRoles(...MANAGERS),
  updateBusValidation(),
  updateBus,
);

export default router;

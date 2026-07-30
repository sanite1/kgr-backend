import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, FRONT_DESK } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createBusValidation,
  updateBusValidation,
  getBusValidation,
  busPerformanceValidation,
  busTripsValidation,
  listBusesValidation,
} from "../validations/bus.validation";
import {
  createBus,
  getBuses,
  getBus,
  getBusPerformance,
  getBusTrips,
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
  requireAccess("buses", "generate"),
  createBusValidation(),
  createBus,
);
// static paths before the bare param path
router.get("/performance", busPerformanceValidation(), getBusPerformance);
router.get("/:id/trips", busTripsValidation(), getBusTrips);
router.get("/:id", getBusValidation(), getBus);
router.patch(
  "/:id",
  authorizeRoles(...MANAGERS),
  requireAccess("buses"),
  updateBusValidation(),
  updateBus,
);

export default router;

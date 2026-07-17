import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import {
  createBatteryValidation,
  updateBatteryValidation,
  issueBatteryValidation,
  collectBatteryValidation,
  setBatteryStatusValidation,
  listBatteriesValidation,
  batteryMovementsValidation,
} from "../validations/battery.validation";
import {
  createBattery,
  getBatteries,
  getBatterySummary,
  updateBattery,
  issueBattery,
  collectBattery,
  setBatteryStatus,
  getBatteryMovements,
} from "../controllers/battery.controller";

const router = Router();

router.use(isAuthenticated);

// static paths before param paths
router.get("/summary", getBatterySummary);
router.get("/", listBatteriesValidation(), getBatteries);
// registering/editing the fleet of packs is admin work
router.post(
  "/",
  authorizeRoles("admin"),
  createBatteryValidation(),
  createBattery,
);
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateBatteryValidation(),
  updateBattery,
);
// daily swap operations: any staff
router.post("/:id/issue", issueBatteryValidation(), issueBattery);
router.post("/:id/collect", collectBatteryValidation(), collectBattery);
router.post("/:id/status", setBatteryStatusValidation(), setBatteryStatus);
router.get("/:id/movements", batteryMovementsValidation(), getBatteryMovements);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, STORE } from "../config/roles";
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
  getIdleBatteries,
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
// which packs have sat unused 48h+: management's view
router.get("/idle", authorizeRoles(...MANAGERS), getIdleBatteries);
router.get("/", listBatteriesValidation(), getBatteries);
// registering/editing the fleet of packs is store work
router.post(
  "/",
  authorizeRoles(...STORE),
  createBatteryValidation(),
  createBattery,
);
router.patch(
  "/:id",
  authorizeRoles(...STORE),
  updateBatteryValidation(),
  updateBattery,
);
// daily swap operations: store work
router.post(
  "/:id/issue",
  authorizeRoles(...STORE),
  issueBatteryValidation(),
  issueBattery,
);
router.post(
  "/:id/collect",
  authorizeRoles(...STORE),
  collectBatteryValidation(),
  collectBattery,
);
router.post(
  "/:id/status",
  authorizeRoles(...STORE),
  setBatteryStatusValidation(),
  setBatteryStatus,
);
router.get("/:id/movements", batteryMovementsValidation(), getBatteryMovements);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS, STORE } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createBatteryValidation,
  updateBatteryValidation,
  issueBatteryValidation,
  collectBatteryValidation,
  setBatteryStatusValidation,
  listBatteriesValidation,
  snoozeBatteryValidation,
  batteryMovementsValidation,
} from "../validations/battery.validation";
import {
  createBattery,
  getBatteries,
  getBatterySummary,
  getIdleBatteries,
  snoozeBattery,
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
router.post(
  "/:id/snooze",
  authorizeRoles(...MANAGERS),
  snoozeBatteryValidation(),
  snoozeBattery,
);
router.get("/", listBatteriesValidation(), getBatteries);
// registering/editing the fleet of packs is store work
router.post(
  "/",
  authorizeRoles(...STORE),
  requireAccess("batteries"),
  createBatteryValidation(),
  createBattery,
);
router.patch(
  "/:id",
  authorizeRoles(...STORE),
  requireAccess("batteries"),
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
  requireAccess("batteries"),
  setBatteryStatusValidation(),
  setBatteryStatus,
);
router.get("/:id/movements", batteryMovementsValidation(), getBatteryMovements);

export default router;

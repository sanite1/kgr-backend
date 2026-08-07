import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  markAttendanceValidation,
  listAttendanceValidation,
  attendanceCompareValidation,
  attendanceDaysValidation,
  attendanceEntryIdValidation,
} from "../validations/batteryAttendance.validation";
import {
  getAttendance,
  markAttendance,
  getAttendanceCompare,
  getAttendanceDays,
  clearAttendance,
} from "../controllers/batteryAttendance.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("battery_attendance"));

// static paths before param paths; past-days overview is management's
router.get(
  "/days",
  authorizeRoles(...MANAGERS),
  attendanceDaysValidation(),
  getAttendanceDays,
);
// laying the three registers side by side is the admin's view alone
router.get(
  "/compare",
  authorizeRoles("admin"),
  attendanceCompareValidation(),
  getAttendanceCompare,
);
router.get("/", listAttendanceValidation(), getAttendance);
router.post("/", markAttendanceValidation(), markAttendance);
router.delete("/:id", attendanceEntryIdValidation(), clearAttendance);

export default router;

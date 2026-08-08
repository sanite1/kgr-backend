import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createAttendanceLogValidation,
  attendanceLogsValidation,
  attendanceCompareValidation,
  attendanceLogIdValidation,
} from "../validations/batteryAttendance.validation";
import {
  getAttendanceFleet,
  createAttendanceLog,
  getAttendanceLogs,
  getAttendanceLog,
  getAttendanceCompare,
  deleteAttendanceLog,
} from "../controllers/batteryAttendance.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("battery_attendance"));

// the blank sheet for a new log
router.get("/fleet", getAttendanceFleet);
// laying a date's logs side by side is the admin's view alone
router.get(
  "/compare",
  authorizeRoles("admin"),
  attendanceCompareValidation(),
  getAttendanceCompare,
);
router.get("/logs", attendanceLogsValidation(), getAttendanceLogs);
router.post("/logs", createAttendanceLogValidation(), createAttendanceLog);
router.get("/logs/:id", attendanceLogIdValidation(), getAttendanceLog);
router.delete(
  "/logs/:id",
  authorizeRoles("admin"),
  attendanceLogIdValidation(),
  deleteAttendanceLog,
);

export default router;

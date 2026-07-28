import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createGatePassValidation,
  decideGatePassValidation,
  clearGatePassItemValidation,
  listGatePassesValidation,
} from "../validations/gatePass.validation";
import {
  createGatePass,
  getGatePasses,
  approveGatePass,
  declineGatePass,
  clearGatePassItem,
  carryOutGatePass,
} from "../controllers/gatePass.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("gate_pass"));

// raising and viewing are scoped inside the service per role
router.get("/", listGatePassesValidation(), getGatePasses);
router.post("/", createGatePassValidation(), createGatePass);

// only management decides
router.post(
  "/:id/approve",
  authorizeRoles(...MANAGERS),
  decideGatePassValidation(),
  approveGatePass,
);
router.post(
  "/:id/decline",
  authorizeRoles(...MANAGERS),
  decideGatePassValidation(),
  declineGatePass,
);

// only the gate (or admin) checks items and confirms they left
router.post(
  "/:id/items/:index/clear",
  authorizeRoles("security", "admin"),
  clearGatePassItemValidation(),
  clearGatePassItem,
);
router.post(
  "/:id/carry-out",
  authorizeRoles("security", "admin"),
  decideGatePassValidation(),
  carryOutGatePass,
);

export default router;

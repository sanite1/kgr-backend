import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import {
  createPartRequestValidation,
  decideRequestValidation,
  listPartRequestsValidation,
  busExpenseValidation,
} from "../validations/partRequest.validation";
import {
  createPartRequest,
  getPartRequests,
  approvePartRequest,
  declinePartRequest,
  getBusExpense,
} from "../controllers/partRequest.controller";

const router = Router();

router.use(isAuthenticated);

// static paths before param paths
router.get(
  "/bus-expense",
  authorizeRoles(...MANAGERS),
  busExpenseValidation(),
  getBusExpense,
);
router.get("/", listPartRequestsValidation(), getPartRequests);
router.post("/", createPartRequestValidation(), createPartRequest);
// approval moves stock and money attribution: managers only
router.post(
  "/:id/approve",
  authorizeRoles(...MANAGERS),
  decideRequestValidation(),
  approvePartRequest,
);
router.post(
  "/:id/decline",
  authorizeRoles(...MANAGERS),
  decideRequestValidation(),
  declinePartRequest,
);

export default router;

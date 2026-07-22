import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createSwapValidation,
  listSwapsValidation,
} from "../validations/batterySwap.validation";
import { createSwap, getSwaps } from "../controllers/batterySwap.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("swaps"));

router.get("/", listSwapsValidation(), getSwaps);
router.post("/", createSwapValidation(), createSwap);

export default router;

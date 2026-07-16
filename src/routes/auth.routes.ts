import { Router } from "express";
import { strictRateLimiter } from "../middlewares/rateLimiter";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import {
  loginValidation,
  refreshValidation,
  changePasswordValidation,
} from "../validations/auth.validation";
import {
  login,
  refreshToken,
  getMe,
  changePassword,
} from "../controllers/auth.controller";

const router = Router();

router.post(
  "/login",
  strictRateLimiter({
    prefix: "login",
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    keyStrategy: "ip",
    message: "Too many login attempts — please wait before trying again",
  }),
  loginValidation(),
  login,
);

router.post("/refresh", refreshValidation(), refreshToken);

router.get("/me", isAuthenticated, getMe);

router.post(
  "/change-password",
  isAuthenticated,
  changePasswordValidation(),
  changePassword,
);

export default router;

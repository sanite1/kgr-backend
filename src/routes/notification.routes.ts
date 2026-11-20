import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { getNotificationCounts } from "../controllers/notification.controller";

const router = Router();

router.get("/counts", isAuthenticated, getNotificationCounts);

export default router;

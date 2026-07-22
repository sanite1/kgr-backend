import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  setTripPriceValidation,
  tripPriceHistoryValidation,
} from "../validations/tripPrice.validation";
import {
  getCurrentTripPrice,
  setTripPrice,
  getTripPriceHistory,
} from "../controllers/tripPrice.controller";

const router = Router();

router.use(isAuthenticated);

router.get("/current", getCurrentTripPrice);
router.get(
  "/history",
  requireAccess("trip_price"),
  tripPriceHistoryValidation(),
  getTripPriceHistory,
);
// changing the price is admin-only
router.post(
  "/",
  authorizeRoles("admin"),
  setTripPriceValidation(),
  setTripPrice,
);

export default router;

import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createHijetEntryValidation,
  hijetEntriesValidation,
  hijetEntryIdValidation,
} from "../validations/hijet.validation";
import {
  createHijetEntry,
  getHijetEntries,
  getHijetSummary,
  deleteHijetEntry,
} from "../controllers/hijet.controller";

const router = Router();

router.use(isAuthenticated, requireAccess("hijet"));

router.get("/summary", getHijetSummary);
router.get("/", hijetEntriesValidation(), getHijetEntries);
router.post("/", createHijetEntryValidation(), createHijetEntry);
router.delete(
  "/:id",
  authorizeRoles("admin"),
  hijetEntryIdValidation(),
  deleteHijetEntry,
);

export default router;

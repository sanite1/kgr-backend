import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { MANAGERS } from "../config/roles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createMoneyBookEntryValidation,
  updateMoneyBookEntryValidation,
  moneyBookMonthValidation,
  moneyBookEntriesValidation,
  moneyBookReportsValidation,
  moneyBookCategoryValidation,
  updateMoneyBookCategoryValidation,
  moneyBookAccountValidation,
  moneyBookIdValidation,
} from "../validations/moneyBook.validation";
import * as c from "../controllers/moneyBook.controller";

const router = Router();

// the team's own money book: management writes and reads it
router.use(
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("money_book"),
);

router.get("/overview", moneyBookMonthValidation(), c.getOverview);
router.get("/entries", moneyBookEntriesValidation(), c.getEntries);
router.get("/reports", moneyBookReportsValidation(), c.getReports);
router.get("/meta", c.getMeta);
router.post("/entries", createMoneyBookEntryValidation(), c.createEntry);
router.patch("/entries/:id", updateMoneyBookEntryValidation(), c.updateEntry);
router.delete("/entries/:id", moneyBookIdValidation(), c.deleteEntry);
router.post("/categories", moneyBookCategoryValidation(), c.createCategory);
router.patch(
  "/categories/:id",
  updateMoneyBookCategoryValidation(),
  c.updateCategory,
);
router.delete("/categories/:id", moneyBookIdValidation(), c.deleteCategory);
router.post("/accounts", moneyBookAccountValidation(), c.createAccount);
router.delete("/accounts/:id", moneyBookIdValidation(), c.deleteAccount);

export default router;

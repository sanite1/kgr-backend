import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import { MANAGERS } from "../config/roles";
import {
  createCategoryValidation,
  updateCategoryValidation,
  createExpenditureValidation,
  updateExpenditureValidation,
  listExpendituresValidation,
  expenditureSummaryValidation,
} from "../validations/expenditure.validation";
import {
  getCategories,
  createCategory,
  updateCategory,
  getExpenditures,
  getExpenditureSummary,
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
} from "../controllers/expenditure.controller";

const router = Router();

// the expenditure ledger is whole-business money: managers and admin
router.use(
  isAuthenticated,
  authorizeRoles(...MANAGERS),
  requireAccess("expenditures"),
);

// categories (folders)
router.get("/categories", getCategories);
router.post("/categories", createCategoryValidation(), createCategory);
router.patch("/categories/:id", updateCategoryValidation(), updateCategory);

// expenditures (static before param)
router.get("/summary", expenditureSummaryValidation(), getExpenditureSummary);
router.get("/", listExpendituresValidation(), getExpenditures);
router.post("/", createExpenditureValidation(), createExpenditure);
router.patch("/:id", updateExpenditureValidation(), updateExpenditure);
router.delete("/:id", deleteExpenditure);

export default router;

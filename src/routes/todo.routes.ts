import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createTodoValidation,
  updateTodoValidation,
  listTodosValidation,
  snoozeTodoValidation,
  todoIdValidation,
} from "../validations/todo.validation";
import {
  getTodos,
  createTodo,
  updateTodo,
  markTodoDone,
  reopenTodo,
  snoozeTodo,
  deleteTodo,
} from "../controllers/todo.controller";

const router = Router();

// one shared company list; the access toggle decides who is on it
// (managers and admins by default)
router.use(isAuthenticated, requireAccess("todos"));

router.get("/", listTodosValidation(), getTodos);
router.post("/", createTodoValidation(), createTodo);
router.patch("/:id", updateTodoValidation(), updateTodo);
router.post("/:id/done", todoIdValidation(), markTodoDone);
router.post("/:id/reopen", todoIdValidation(), reopenTodo);
router.post("/:id/snooze", snoozeTodoValidation(), snoozeTodo);
router.delete("/:id", todoIdValidation(), deleteTodo);

export default router;

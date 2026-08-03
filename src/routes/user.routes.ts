import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { requireAccess } from "../middlewares/requireAccess";
import {
  createUserValidation,
  updateUserValidation,
  getUserValidation,
  listUsersValidation,
} from "../validations/user.validation";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";

const router = Router();

// every user-management route is admin-only, and an admin whose Users
// tab was switched off loses the API too
router.use(isAuthenticated, authorizeRoles("admin"), requireAccess("users"));

router.get("/", listUsersValidation(), getUsers);
router.post("/", createUserValidation(), createUser);
router.get("/:id", getUserValidation(), getUser);
router.patch("/:id", updateUserValidation(), updateUser);
router.delete("/:id", getUserValidation(), deleteUser);

export default router;

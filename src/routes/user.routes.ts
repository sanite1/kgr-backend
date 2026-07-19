import { Router } from "express";
import { isAuthenticated } from "../middlewares/authenticatedMiddleWare";
import { authorizeRoles } from "../middlewares/authorizeRoles";
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

// every user-management route is admin-only
router.use(isAuthenticated, authorizeRoles("admin"));

router.get("/", listUsersValidation(), getUsers);
router.post("/", createUserValidation(), createUser);
router.get("/:id", getUserValidation(), getUser);
router.patch("/:id", updateUserValidation(), updateUser);
router.delete("/:id", getUserValidation(), deleteUser);

export default router;

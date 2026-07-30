import { Router } from "express";
import { permissions } from "../constants/roles.js";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/authorize.js";

const controller = new UserController();
export const userRouter = Router();

userRouter.get("/me", authenticate, controller.me);
userRouter.get("/", authenticate, requirePermission(permissions.usersRead), controller.list);

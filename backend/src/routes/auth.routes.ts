import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "../dto/auth.dto.js";

const controller = new AuthController();
export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), controller.register);
authRouter.post("/login", validate(loginSchema), controller.login);
authRouter.post("/refresh", validate(refreshSchema), controller.refresh);
authRouter.post("/logout", authenticate, validate(logoutSchema), controller.logout);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), controller.forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), controller.resetPassword);
authRouter.post("/change-password", authenticate, validate(changePasswordSchema), controller.changePassword);

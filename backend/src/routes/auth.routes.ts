import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
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

authRouter.post("/register", validate(registerSchema), asyncHandler(controller.register));
authRouter.post("/login", validate(loginSchema), asyncHandler(controller.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(controller.refresh));
authRouter.post("/logout", authenticate, validate(logoutSchema), asyncHandler(controller.logout));
authRouter.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
authRouter.post("/reset-password", validate(resetPasswordSchema), asyncHandler(controller.resetPassword));
authRouter.post("/change-password", authenticate, validate(changePasswordSchema), asyncHandler(controller.changePassword));

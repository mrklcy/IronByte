import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { ok } from "../utils/api-response.js";

export class AuthController {
  constructor(private readonly auth = new AuthService()) {}

  register = async (req: Request, res: Response) => {
    const user = await this.auth.register(req.body);
    return ok(res, "Registration completed successfully.", user, undefined, 201);
  };

  login = async (req: Request, res: Response) => {
    const data = await this.auth.login({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });
    return ok(res, "Login completed successfully.", data);
  };

  refresh = async (req: Request, res: Response) => {
    const data = await this.auth.refresh(req.body.refreshToken);
    return ok(res, "Token refreshed successfully.", data);
  };

  logout = async (req: Request, res: Response) => {
    await this.auth.logout(req.body.refreshToken, req.user?.sessionId);
    return ok(res, "Logout completed successfully.", {});
  };

  forgotPassword = async (req: Request, res: Response) => {
    const data = await this.auth.forgotPassword(req.body.email);
    return ok(res, "If the account exists, reset instructions will be sent.", data);
  };

  resetPassword = async (req: Request, res: Response) => {
    await this.auth.resetPassword(req.body.token, req.body.password);
    return ok(res, "Password reset successfully.", {});
  };

  changePassword = async (req: Request, res: Response) => {
    await this.auth.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    return ok(res, "Password changed successfully.", {});
  };
}

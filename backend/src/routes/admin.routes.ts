import { Router } from "express";
import { permissions } from "../constants/roles.js";
import { AdminController } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission, requireRole } from "../middleware/authorize.js";

const controller = new AdminController();
export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMINISTRATOR"), requirePermission(permissions.adminAccess));
adminRouter.get("/dashboard", controller.dashboard);

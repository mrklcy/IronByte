import { Router } from "express";
import { permissions } from "../constants/roles.js";
import { ContentController } from "../controllers/content.controller.js";
import { listContentSchema, slugParamSchema, submitFlagSchema } from "../dto/content.dto.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

const controller = new ContentController();
export const contentRouter = Router();

contentRouter.get("/courses", validate(listContentSchema), controller.listCourses);
contentRouter.get("/courses/:slug", validate(slugParamSchema), controller.getCourse);
contentRouter.get("/labs", validate(listContentSchema), controller.listLabs);
contentRouter.get("/challenges", validate(listContentSchema), controller.listChallenges);
contentRouter.get("/challenges/:slug", validate(slugParamSchema), controller.getChallenge);
contentRouter.post(
  "/challenges/:slug/submissions",
  authenticate,
  requirePermission(permissions.ctfSubmit),
  validate(submitFlagSchema),
  controller.submitFlag,
);
contentRouter.get("/leaderboard", controller.leaderboard);
contentRouter.get("/notifications", authenticate, controller.notifications);

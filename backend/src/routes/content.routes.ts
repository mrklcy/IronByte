import { Router } from "express";
import { permissions } from "../constants/roles.js";
import { ContentController } from "../controllers/content.controller.js";
import { communityPostSchema, idParamSchema, listContentSchema, slugParamSchema, submitFlagSchema, updateSettingsSchema } from "../dto/content.dto.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";

const controller = new ContentController();
export const contentRouter = Router();

contentRouter.get("/courses", validate(listContentSchema), controller.listCourses);
contentRouter.get("/courses/:slug", validate(slugParamSchema), controller.getCourse);
contentRouter.get("/labs", validate(listContentSchema), controller.listLabs);
contentRouter.get("/lab-attempts", authenticate, controller.activeLabAttempts);
contentRouter.post(
  "/labs/:slug/start",
  authenticate,
  requirePermission(permissions.labsUse),
  validate(slugParamSchema),
  controller.startLab,
);
contentRouter.post("/lab-attempts/:id/stop", authenticate, validate(idParamSchema), controller.stopLabAttempt);
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
contentRouter.post("/notifications/:id/read", authenticate, validate(idParamSchema), controller.markNotificationRead);
contentRouter.get("/certificates", authenticate, controller.certificates);
contentRouter.post("/certificates/web-security-foundations/issue", authenticate, controller.issueCertificate);
contentRouter.get("/community", controller.communityPosts);
contentRouter.post("/community", authenticate, validate(communityPostSchema), controller.createCommunityPost);
contentRouter.get("/settings", authenticate, controller.settings);
contentRouter.put("/settings", authenticate, validate(updateSettingsSchema), controller.updateSettings);

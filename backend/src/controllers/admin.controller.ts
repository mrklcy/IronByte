import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { ok } from "../utils/api-response.js";

export class AdminController {
  dashboard = async (_req: Request, res: Response) => {
    const [users, courses, labs, challenges, submissions, auditLogs] = await prisma.$transaction([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lab.count(),
      prisma.challenge.count(),
      prisma.flagSubmission.count(),
      prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    ]);
    return ok(res, "Admin dashboard loaded.", { users, courses, labs, challenges, submissions, auditLogs });
  };
}

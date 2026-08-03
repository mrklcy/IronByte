import type { Request, Response } from "express";
import { ContentService } from "../services/content.service.js";
import { ok } from "../utils/api-response.js";

export class ContentController {
  constructor(private readonly content = new ContentService()) {}

  listCourses = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const [total, data] = await this.content.listCourses(page, pageSize, queryString(req.query.search));
    return ok(res, "Courses loaded.", data, { page, pageSize, total });
  };

  getCourse = async (req: Request, res: Response) => ok(res, "Course loaded.", await this.content.getCourse(pathParam(req.params.slug)));

  listLabs = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const [total, data] = await this.content.listLabs(page, pageSize, queryString(req.query.search));
    return ok(res, "Labs loaded.", data, { page, pageSize, total });
  };

  listChallenges = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const [total, data] = await this.content.listChallenges(page, pageSize, queryString(req.query.search));
    return ok(res, "Challenges loaded.", data, { page, pageSize, total });
  };

  getChallenge = async (req: Request, res: Response) =>
    ok(res, "Challenge loaded.", await this.content.getChallenge(pathParam(req.params.slug)));

  submitFlag = async (req: Request, res: Response) =>
    ok(res, "Flag submission processed.", await this.content.submitFlag(pathParam(req.params.slug), req.user!.id, req.body.flag, req.body.teamId));

  leaderboard = async (_req: Request, res: Response) => ok(res, "Leaderboard loaded.", await this.content.leaderboard(10));

  notifications = async (req: Request, res: Response) =>
    ok(res, "Notifications loaded.", await this.content.notifications(req.user!.id));

  markNotificationRead = async (req: Request, res: Response) =>
    ok(res, "Notification marked as read.", await this.content.markNotificationRead(pathParam(req.params.id), req.user!.id));

  activeLabAttempts = async (req: Request, res: Response) =>
    ok(res, "Active lab attempts loaded.", await this.content.activeLabAttempts(req.user!.id));

  startLab = async (req: Request, res: Response) =>
    ok(res, "Lab started.", await this.content.startLab(pathParam(req.params.slug), req.user!.id), undefined, 201);

  stopLabAttempt = async (req: Request, res: Response) =>
    ok(res, "Lab stopped.", await this.content.stopLabAttempt(pathParam(req.params.id), req.user!.id));

  submitLabFlag = async (req: Request, res: Response) =>
    ok(res, "Lab flag submission processed.", await this.content.submitLabFlag(pathParam(req.params.slug), req.user!.id, req.body.flag));

  certificates = async (req: Request, res: Response) =>
    ok(res, "Certificates loaded.", await this.content.certificates(req.user!.id));

  issueCertificate = async (req: Request, res: Response) =>
    ok(res, "Certificate issued.", await this.content.issueCertificate(req.user!.id, "Web Security Foundations"), undefined, 201);

  communityPosts = async (_req: Request, res: Response) =>
    ok(res, "Community posts loaded.", await this.content.communityPosts());

  createCommunityPost = async (req: Request, res: Response) =>
    ok(res, "Community post created.", await this.content.createCommunityPost(req.user!.id, req.body.message), undefined, 201);

  settings = async (req: Request, res: Response) =>
    ok(res, "Settings loaded.", await this.content.settings(req.user!.id));

  updateSettings = async (req: Request, res: Response) =>
    ok(res, "Settings updated.", await this.content.updateSettings(req.user!.id, req.body));
}

function queryString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function pathParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

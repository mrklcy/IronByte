import type { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository.js";
import { ok } from "../utils/api-response.js";

export class UserController {
  constructor(private readonly users = new UserRepository()) {}

  me = async (req: Request, res: Response) => {
    const user = await this.users.findById(req.user!.id);
    return ok(res, "Current user loaded.", user);
  };

  analytics = async (req: Request, res: Response) => {
    const solved = await this.users.solvedAnalytics(req.user!.id);
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};

    for (const submission of solved) {
      const category = submission.challenge.category.name;
      const difficulty = submission.challenge.difficulty;
      byCategory[category] = (byCategory[category] ?? 0) + 1;
      byDifficulty[difficulty] = (byDifficulty[difficulty] ?? 0) + 1;
    }

    return ok(res, "Profile analytics loaded.", {
      solvedTotal: solved.length,
      xpFromSolved: solved.reduce((total, submission) => total + submission.awardedXp, 0),
      byCategory,
      byDifficulty,
      recentSolved: solved.slice(0, 6).map((submission) => ({
        slug: submission.challenge.slug,
        title: submission.challenge.title,
        category: submission.challenge.category.name,
        difficulty: submission.challenge.difficulty,
        awardedXp: submission.awardedXp,
        solvedAt: submission.createdAt,
      })),
    });
  };

  list = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const [total, users] = await this.users.list({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: req.query.search?.toString(),
    });
    return ok(res, "Users loaded.", users, { page, pageSize, total });
  };
}

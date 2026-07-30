import type { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository.js";
import { ok } from "../utils/api-response.js";

export class UserController {
  constructor(private readonly users = new UserRepository()) {}

  me = async (req: Request, res: Response) => {
    const user = await this.users.findById(req.user!.id);
    return ok(res, "Current user loaded.", user);
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

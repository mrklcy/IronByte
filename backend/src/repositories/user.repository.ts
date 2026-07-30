import type { Prisma, RoleName } from "@prisma/client";
import { prisma } from "../database/prisma.js";

export class UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  }

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  }

  async createStudent(input: { email: string; username: string; displayName?: string; passwordHash: string }) {
    const studentRole = await prisma.role.upsert({
      where: { name: "STUDENT" },
      update: {},
      create: { name: "STUDENT", description: "Default learner role" },
    });

    return prisma.user.create({
      data: {
        ...input,
        roles: {
          create: {
            roleId: studentRole.id,
          },
        },
      },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  list(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.UserWhereInput | undefined = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: "insensitive" } },
            { username: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : undefined;

    return prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          xp: true,
          level: true,
          createdAt: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      }),
    ]);
  }

  roleNames(user: Awaited<ReturnType<UserRepository["findById"]>>): RoleName[] {
    return user?.roles.map((userRole) => userRole.role.name) ?? [];
  }

  permissions(user: Awaited<ReturnType<UserRepository["findById"]>>): string[] {
    const keys = user?.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
    );
    return [...new Set(keys ?? [])];
  }
}

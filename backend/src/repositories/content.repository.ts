import { ContentStatus, Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "../database/prisma.js";

export class ContentRepository {
  listCourses(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.CourseWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(params.search ? { title: { contains: params.search, mode: "insensitive" } } : {}),
    };
    return prisma.$transaction([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
      }),
    ]);
  }

  getCourse(slug: string) {
    return prisma.course.findUnique({
      where: { slug },
      include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
    });
  }

  listLabs(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.LabWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(params.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
    };
    return prisma.$transaction([
      prisma.lab.count({ where }),
      prisma.lab.findMany({ where, skip: params.skip, take: params.take, include: { category: true } }),
    ]);
  }

  listChallenges(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.ChallengeWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(params.search ? { title: { contains: params.search, mode: "insensitive" } } : {}),
    };
    return prisma.$transaction([
      prisma.challenge.count({ where }),
      prisma.challenge.findMany({
        where,
        skip: params.skip,
        take: params.take,
        include: { category: true, hints: { select: { id: true, title: true, penaltyPct: true } } },
      }),
    ]);
  }

  getChallenge(slug: string) {
    return prisma.challenge.findUnique({
      where: { slug },
      include: { category: true, hints: true },
    });
  }

  createFlagSubmission(input: {
    challengeId: string;
    userId: string;
    teamId?: string;
    submittedFlagHash: string;
    status: SubmissionStatus;
    awardedXp: number;
  }) {
    return prisma.flagSubmission.create({ data: input });
  }

  awardXp(userId: string, xp: number) {
    return prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp } } });
  }

  leaderboard(limit = 10) {
    return prisma.user.findMany({
      take: limit,
      orderBy: [{ xp: "desc" }, { username: "asc" }],
      select: { id: true, username: true, displayName: true, xp: true, level: true },
    });
  }

  notifications(userId: string) {
    return prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { notification: true },
    });
  }
}

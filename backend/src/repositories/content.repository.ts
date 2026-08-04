import { ContentStatus, LabStatus, Prisma, SubmissionStatus } from "@prisma/client";
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
        include: {
          category: true,
          hints: { select: { id: true, title: true, penaltyPct: true } },
          files: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);
  }

  getChallenge(slug: string) {
    return prisma.challenge.findUnique({
      where: { slug },
      include: { category: true, hints: true, files: { orderBy: { createdAt: "asc" } } },
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

  correctFlagSubmission(challengeId: string, userId: string) {
    return prisma.flagSubmission.findFirst({
      where: { challengeId, userId, status: SubmissionStatus.CORRECT },
      orderBy: { createdAt: "asc" },
    });
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

  async markNotificationRead(id: string, userId: string) {
    await prisma.userNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return prisma.userNotification.findFirst({
      where: { id, userId },
      include: { notification: true },
    });
  }

  async activeLabAttempts(userId: string) {
    await prisma.labAttempt.updateMany({
      where: { userId, status: LabStatus.RUNNING, expiresAt: { lte: new Date() } },
      data: { status: LabStatus.EXPIRED, stoppedAt: new Date() },
    });

    return prisma.labAttempt.findMany({
      where: { userId, status: LabStatus.RUNNING },
      orderBy: { createdAt: "desc" },
      include: { lab: { include: { category: true } } },
    });
  }

  expiredRunningLabAttempts(userId: string) {
    return prisma.labAttempt.findMany({
      where: { userId, status: LabStatus.RUNNING, expiresAt: { lte: new Date() } },
      include: { lab: { include: { category: true } } },
    });
  }

  getLab(slug: string) {
    return prisma.lab.findUnique({
      where: { slug },
      include: { category: true },
    });
  }

  activeAttemptForLab(userId: string, labId: string) {
    return prisma.labAttempt.findFirst({
      where: { userId, labId, status: LabStatus.RUNNING, expiresAt: { gt: new Date() } },
      include: { lab: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async startLab(slug: string, userId: string) {
    const lab = await prisma.lab.findUnique({ where: { slug } });
    if (!lab || lab.status !== ContentStatus.PUBLISHED) return null;
    const now = new Date();

    await prisma.labAttempt.updateMany({
      where: { userId, labId: lab.id, status: LabStatus.RUNNING },
      data: { status: LabStatus.STOPPED, stoppedAt: now },
    });

    return prisma.labAttempt.create({
      data: {
        userId,
        labId: lab.id,
        status: LabStatus.RUNNING,
        startedAt: now,
        expiresAt: new Date(now.getTime() + lab.timeLimitMinutes * 60 * 1000),
      },
      include: { lab: { include: { category: true } } },
    });
  }

  updateLabAttemptTarget(
    id: string,
    userId: string,
    target: {
      ipAddress: string;
      accessUrl: string;
      provider: string;
      providerInstanceId?: string;
      targetMetadata?: Prisma.InputJsonValue;
    },
  ) {
    return prisma.labAttempt.update({
      where: { id },
      data: target,
      include: { lab: { include: { category: true } } },
    });
  }

  async stopLabAttempt(id: string, userId: string) {
    await prisma.labAttempt.updateMany({
      where: { id, userId },
      data: { status: LabStatus.STOPPED, stoppedAt: new Date() },
    });
    return prisma.labAttempt.findFirst({
      where: { id, userId },
      include: { lab: { include: { category: true } } },
    });
  }

  async completeLab(userId: string, labId: string, xp: number, attemptId?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.labProgress.findUnique({ where: { userId_labId: { userId, labId } } });
      const firstCompletion = !existing?.completedAt;
      const completedAt = existing?.completedAt ?? new Date();

      const progress = await tx.labProgress.upsert({
        where: { userId_labId: { userId, labId } },
        update: { progressPct: 100, completedAt },
        create: { userId, labId, progressPct: 100, completedAt },
      });

      if (attemptId) {
        await tx.labAttempt.updateMany({
          where: { id: attemptId, userId, labId },
          data: { status: LabStatus.STOPPED, stoppedAt: new Date() },
        });
      }

      if (firstCompletion) {
        await tx.user.update({ where: { id: userId }, data: { xp: { increment: xp } } });
        await tx.userProgress.upsert({
          where: { userId },
          update: { totalXp: { increment: xp }, labsCompleted: { increment: 1 } },
          create: { userId, totalXp: xp, labsCompleted: 1 },
        });
        await tx.xPTransaction.create({
          data: { userId, amount: xp, reason: "Lab completed", sourceType: "lab", sourceId: labId },
        });
      }

      return { progress, firstCompletion };
    });
  }

  certificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
    });
  }

  issueCertificate(userId: string, title: string) {
    return prisma.certificate.upsert({
      where: { serial: `${userId}:${title}` },
      update: {},
      create: {
        userId,
        title,
        serial: `${userId}:${title}`,
      },
    });
  }

  communityPosts(limit = 25) {
    return prisma.activityLog.findMany({
      where: { action: "community.post" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, username: true, displayName: true, level: true, xp: true } } },
    });
  }

  createCommunityPost(userId: string, message: string) {
    return prisma.activityLog.create({
      data: {
        userId,
        action: "community.post",
        metadata: { message },
      },
      include: { user: { select: { id: true, username: true, displayName: true, level: true, xp: true } } },
    });
  }

  userSettings(userId: string) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  updateUserSettings(userId: string, data: { theme?: string; emailNotifications?: boolean; profileVisibility?: string }) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}

import { Prisma, SubmissionStatus } from "@prisma/client";
import { AppError } from "../exceptions/app-error.js";
import { ContentRepository } from "../repositories/content.repository.js";
import { LabOrchestrator } from "./lab-orchestrator.service.js";
import { sha256 } from "../utils/crypto.js";

const labXpByDifficulty = {
  BEGINNER: 120,
  EASY: 180,
  MEDIUM: 260,
  HARD: 360,
  EXPERT: 500,
} as const;

export class ContentService {
  constructor(
    private readonly content = new ContentRepository(),
    private readonly labs = new LabOrchestrator(),
  ) {}

  async listCourses(page: number, pageSize: number, search?: string) {
    return this.content.listCourses({ skip: (page - 1) * pageSize, take: pageSize, search });
  }

  async getCourse(slug: string) {
    const course = await this.content.getCourse(slug);
    if (!course) throw new AppError("Course not found.", 404, "COURSE_NOT_FOUND");
    return course;
  }

  async listLabs(page: number, pageSize: number, search?: string) {
    return this.content.listLabs({ skip: (page - 1) * pageSize, take: pageSize, search });
  }

  async listChallenges(page: number, pageSize: number, search?: string) {
    const [total, challenges] = await this.content.listChallenges({ skip: (page - 1) * pageSize, take: pageSize, search });
    return [total, challenges.map((challenge) => ({ ...challenge, flagHash: undefined }))] as const;
  }

  async getChallenge(slug: string) {
    const challenge = await this.content.getChallenge(slug);
    if (!challenge) throw new AppError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");
    return { ...challenge, flagHash: undefined };
  }

  async submitFlag(slug: string, userId: string, flag: string, teamId?: string) {
    const challenge = await this.content.getChallenge(slug);
    if (!challenge) throw new AppError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");

    const correct = sha256(flag.trim()) === challenge.flagHash;
    const existingCorrect = correct ? await this.content.correctFlagSubmission(challenge.id, userId) : null;
    const awardedXp = correct && !existingCorrect ? challenge.baseXp : 0;

    const submission = await this.content.createFlagSubmission({
      challengeId: challenge.id,
      userId,
      teamId,
      submittedFlagHash: sha256(flag.trim()),
      status: correct ? SubmissionStatus.CORRECT : SubmissionStatus.INCORRECT,
      awardedXp,
    });

    if (awardedXp > 0) await this.content.awardXp(userId, awardedXp);

    return {
      correct,
      awardedXp,
      submissionId: submission.id,
      alreadySolved: !!existingCorrect,
    };
  }

  leaderboard(limit?: number) {
    return this.content.leaderboard(limit);
  }

  notifications(userId: string) {
    return this.content.notifications(userId);
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await this.content.markNotificationRead(id, userId);
    if (!notification) throw new AppError("Notification not found.", 404, "NOTIFICATION_NOT_FOUND");
    return notification;
  }

  async activeLabAttempts(userId: string) {
    const expired = await this.content.expiredRunningLabAttempts(userId);
    await Promise.all(expired.map((attempt) => this.labs.stop(attempt.provider, attempt.providerInstanceId)));
    const attempts = await this.content.activeLabAttempts(userId);
    return attempts.map((attempt) => this.withLabTarget(attempt));
  }

  async startLab(slug: string, userId: string) {
    const lab = await this.content.getLab(slug);
    if (!lab) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");

    const running = await this.content.activeAttemptForLab(userId, lab.id);
    if (running) await this.stopLabAttempt(running.id, userId);

    const attempt = await this.content.startLab(slug, userId);
    if (!attempt) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");

    try {
      const target = await this.labs.start(lab, attempt.id);
      const updated = await this.content.updateLabAttemptTarget(attempt.id, userId, {
        ipAddress: target.ipAddress,
        accessUrl: target.accessUrl,
        provider: target.provider,
        providerInstanceId: target.providerInstanceId,
        targetMetadata: target.metadata as Prisma.InputJsonValue,
      });
      return this.withLabTarget(updated);
    } catch (error) {
      await this.content.stopLabAttempt(attempt.id, userId).catch(() => undefined);
      throw error;
    }
  }

  async stopLabAttempt(id: string, userId: string) {
    const attempt = await this.content.stopLabAttempt(id, userId);
    if (!attempt) throw new AppError("Lab attempt not found.", 404, "LAB_ATTEMPT_NOT_FOUND");
    await this.labs.stop(attempt.provider, attempt.providerInstanceId);
    return this.withLabTarget(attempt);
  }

  async submitLabFlag(slug: string, userId: string, flag: string) {
    const lab = await this.content.getLab(slug);
    if (!lab) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");

    const attempt = await this.content.activeAttemptForLab(userId, lab.id);
    if (!attempt) throw new AppError("Start this machine before submitting a lab flag.", 409, "LAB_NOT_RUNNING");

    const correct = flag.trim() === this.labs.flagFor(slug);
    if (!correct) return { correct, awardedXp: 0, completed: false, expectedFormat: "TH{...}" };

    const awardedXp = labXpByDifficulty[lab.difficulty];
    const result = await this.content.completeLab(userId, lab.id, awardedXp, attempt.id);
    await this.labs.stop(attempt.provider, attempt.providerInstanceId);
    return {
      correct,
      awardedXp: result.firstCompletion ? awardedXp : 0,
      completed: true,
      alreadyCompleted: !result.firstCompletion,
    };
  }

  certificates(userId: string) {
    return this.content.certificates(userId);
  }

  async issueCertificate(userId: string, title: string) {
    return this.content.issueCertificate(userId, title);
  }

  communityPosts() {
    return this.content.communityPosts();
  }

  createCommunityPost(userId: string, message: string) {
    return this.content.createCommunityPost(userId, message);
  }

  settings(userId: string) {
    return this.content.userSettings(userId);
  }

  updateSettings(userId: string, input: { theme?: string; emailNotifications?: boolean; profileVisibility?: string }) {
    return this.content.updateUserSettings(userId, input);
  }

  private withLabTarget<T extends { ipAddress?: string | null; accessUrl?: string | null; provider?: string | null; targetMetadata?: unknown; lab: { slug: string; name: string; os: string; difficulty: keyof typeof labXpByDifficulty } }>(attempt: T) {
    const address = attempt.ipAddress ?? "pending";
    const metadata = isRecord(attempt.targetMetadata) ? attempt.targetMetadata : {};
    const username = typeof metadata.username === "string" ? metadata.username : "learner";
    const password = typeof metadata.password === "string" ? metadata.password : `trainhack-${attempt.lab.slug}`;
    return {
      ...attempt,
      ipAddress: address,
      target: {
        address,
        url: attempt.accessUrl ?? `http://${address}`,
        username,
        password,
        flagFormat: "TH{...}",
        objective: `Enumerate ${attempt.lab.name}, validate the finding, and submit the proof flag.`,
        rewardXp: labXpByDifficulty[attempt.lab.difficulty],
        commands: [`curl ${attempt.accessUrl ?? `http://${address}`}/status`, `curl ${attempt.accessUrl ?? `http://${address}`}/robots.txt`],
        clues: [
          `The training flag for this lab follows TH{${attempt.lab.slug.replace(/-/g, "_")}_...}.`,
          "Use the service notes and exposed metadata first; the flag is the final proof, not the first thing to guess.",
          attempt.provider === "docker"
            ? "This machine is running in an isolated Docker container for the active attempt."
            : "This local environment is using the simulation lab provider.",
        ],
      },
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

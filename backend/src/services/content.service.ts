import { SubmissionStatus } from "@prisma/client";
import { AppError } from "../exceptions/app-error.js";
import { ContentRepository } from "../repositories/content.repository.js";
import { sha256 } from "../utils/crypto.js";

export class ContentService {
  constructor(private readonly content = new ContentRepository()) {}

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
    const awardedXp = correct ? challenge.baseXp : 0;

    const submission = await this.content.createFlagSubmission({
      challengeId: challenge.id,
      userId,
      teamId,
      submittedFlagHash: sha256(flag.trim()),
      status: correct ? SubmissionStatus.CORRECT : SubmissionStatus.INCORRECT,
      awardedXp,
    });

    if (correct) await this.content.awardXp(userId, awardedXp);

    return {
      correct,
      awardedXp,
      submissionId: submission.id,
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

  activeLabAttempts(userId: string) {
    return this.content.activeLabAttempts(userId);
  }

  async startLab(slug: string, userId: string) {
    const attempt = await this.content.startLab(slug, userId);
    if (!attempt) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");
    return attempt;
  }

  async stopLabAttempt(id: string, userId: string) {
    const attempt = await this.content.stopLabAttempt(id, userId);
    if (!attempt) throw new AppError("Lab attempt not found.", 404, "LAB_ATTEMPT_NOT_FOUND");
    return attempt;
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
}

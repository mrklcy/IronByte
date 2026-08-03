import { SubmissionStatus } from "@prisma/client";
import { AppError } from "../exceptions/app-error.js";
import { ContentRepository } from "../repositories/content.repository.js";
import { sha256 } from "../utils/crypto.js";

const labXpByDifficulty = {
  BEGINNER: 120,
  EASY: 180,
  MEDIUM: 260,
  HARD: 360,
  EXPERT: 500,
} as const;

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

  async activeLabAttempts(userId: string) {
    const attempts = await this.content.activeLabAttempts(userId);
    return attempts.map((attempt) => this.withLabTarget(attempt));
  }

  async startLab(slug: string, userId: string) {
    const lab = await this.content.getLab(slug);
    if (!lab) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");
    const attempt = await this.content.startLab(slug, userId, this.labAddress(slug));
    if (!attempt) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");
    return this.withLabTarget(attempt);
  }

  async stopLabAttempt(id: string, userId: string) {
    const attempt = await this.content.stopLabAttempt(id, userId);
    if (!attempt) throw new AppError("Lab attempt not found.", 404, "LAB_ATTEMPT_NOT_FOUND");
    return this.withLabTarget(attempt);
  }

  async submitLabFlag(slug: string, userId: string, flag: string) {
    const lab = await this.content.getLab(slug);
    if (!lab) throw new AppError("Lab not found.", 404, "LAB_NOT_FOUND");

    const attempt = await this.content.activeAttemptForLab(userId, lab.id);
    if (!attempt) throw new AppError("Start this machine before submitting a lab flag.", 409, "LAB_NOT_RUNNING");

    const correct = flag.trim() === this.labFlag(slug);
    if (!correct) return { correct, awardedXp: 0, completed: false, expectedFormat: "TH{...}" };

    const awardedXp = labXpByDifficulty[lab.difficulty];
    const result = await this.content.completeLab(userId, lab.id, awardedXp, attempt.id);
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

  private labAddress(slug: string) {
    const digest = sha256(slug);
    const third = 10 + (parseInt(digest.slice(0, 2), 16) % 120);
    const fourth = 10 + (parseInt(digest.slice(2, 4), 16) % 200);
    return `10.10.${third}.${fourth}`;
  }

  private labFlag(slug: string) {
    return `TH{${slug.replace(/-/g, "_")}_owned}`;
  }

  private withLabTarget<T extends { ipAddress?: string | null; lab: { slug: string; name: string; os: string; difficulty: keyof typeof labXpByDifficulty } }>(attempt: T) {
    const address = attempt.ipAddress ?? this.labAddress(attempt.lab.slug);
    return {
      ...attempt,
      ipAddress: address,
      target: {
        address,
        url: `http://${address}`,
        username: "learner",
        password: `trainhack-${attempt.lab.slug}`,
        flagFormat: "TH{...}",
        objective: `Enumerate ${attempt.lab.name}, validate the finding, and submit the proof flag.`,
        rewardXp: labXpByDifficulty[attempt.lab.difficulty],
        commands: [`ping ${address}`, `nmap -sV ${address}`, `curl http://${address}/status`],
        clues: [
          `The training flag for this lab follows TH{${attempt.lab.slug.replace(/-/g, "_")}_...}.`,
          "Use the service notes and exposed metadata first; the flag is the final proof, not the first thing to guess.",
          "For this local simulation, completing the machine requires the lab proof flag shown by the training pattern.",
        ],
      },
    };
  }
}

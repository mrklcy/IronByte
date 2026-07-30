import argon2 from "argon2";
import { AppError } from "../exceptions/app-error.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { randomToken, sha256 } from "../utils/crypto.js";
import { signAccessToken } from "../utils/tokens.js";
import { env } from "../config/env.js";

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly auth = new AuthRepository(),
  ) {}

  async register(input: { email: string; username: string; password: string; displayName?: string }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new AppError("Email is already registered.", 409, "EMAIL_EXISTS");

    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.createStudent({
      email: input.email.toLowerCase(),
      username: input.username,
      displayName: input.displayName,
      passwordHash,
    });

    return this.publicUser(user);
  }

  async login(input: {
    email: string;
    password: string;
    deviceId?: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const user = await this.users.findByEmail(input.email.toLowerCase());
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AppError("Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }

    const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.auth.createSession({
      userId: user.id,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: refreshExpiresAt,
    });
    const refreshToken = randomToken();
    await this.auth.storeRefreshToken({
      userId: user.id,
      sessionId: session.id,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiresAt,
    });

    return this.tokenPair(user, session.id, refreshToken);
  }

  async refresh(refreshToken: string) {
    const token = await this.auth.findRefreshToken(sha256(refreshToken));
    if (!token || token.revokedAt || token.expiresAt < new Date() || token.session.revokedAt) {
      throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }
    return this.tokenPair(token.user, token.sessionId, refreshToken);
  }

  async logout(refreshToken?: string, sessionId?: string) {
    if (refreshToken) await this.auth.revokeRefreshToken(sha256(refreshToken));
    if (sessionId) await this.auth.revokeSession(sessionId);
  }

  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user) return { issued: false };
    const token = randomToken();
    await this.auth.createPasswordResetToken({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
    });
    return { issued: true, token };
  }

  async resetPassword(token: string, password: string) {
    const reset = await this.auth.findPasswordResetToken(sha256(token));
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new AppError("Invalid password reset token.", 400, "INVALID_RESET_TOKEN");
    }
    await this.users.updatePassword(reset.userId, await argon2.hash(password));
    await this.auth.markPasswordResetUsed(reset.id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new AppError("Current password is incorrect.", 400, "INVALID_PASSWORD");
    }
    await this.users.updatePassword(userId, await argon2.hash(newPassword));
  }

  private tokenPair(user: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>, sessionId: string, refreshToken: string) {
    const roles = this.users.roleNames(user);
    const permissions = this.users.permissions(user);
    return {
      user: this.publicUser(user),
      accessToken: signAccessToken({ sub: user.id, email: user.email, roles, permissions, sessionId }),
      refreshToken,
    };
  }

  private publicUser(user: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      xp: user.xp,
      level: user.level,
      roles: this.users.roleNames(user),
      permissions: this.users.permissions(user),
    };
  }
}

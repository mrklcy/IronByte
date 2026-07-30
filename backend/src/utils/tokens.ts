import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { RoleName } from "../constants/roles.js";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    audience: "trainhack-api",
    issuer: "trainhack",
  } as SignOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    audience: "trainhack-api",
    issuer: "trainhack",
  }) as AccessTokenPayload;
}

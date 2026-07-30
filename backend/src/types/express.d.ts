import type { RoleName } from "../constants/roles.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: RoleName[];
        permissions: string[];
        sessionId?: string;
      };
      requestId?: string;
    }
  }
}

export {};

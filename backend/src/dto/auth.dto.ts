import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(12).max(128),
    displayName: z.string().min(1).max(80).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceId: z.string().max(120).optional(),
    deviceName: z.string().max(120).optional(),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32).optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password: z.string().min(12).max(128),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
  }),
});

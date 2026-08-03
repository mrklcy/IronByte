import { Difficulty, ContentStatus } from "@prisma/client";
import { z } from "zod";
import { paginationQuery } from "./common.dto.js";

export const listContentSchema = z.object({
  query: paginationQuery.extend({
    difficulty: z.nativeEnum(Difficulty).optional(),
    status: z.nativeEnum(ContentStatus).optional(),
    category: z.string().optional(),
  }),
});

export const slugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1).max(120),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const submitFlagSchema = z.object({
  params: z.object({
    slug: z.string().min(1).max(120),
  }),
  body: z.object({
    flag: z.string().min(3).max(500),
    teamId: z.string().uuid().optional(),
  }),
});

export const communityPostSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(280),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    emailNotifications: z.boolean().optional(),
    profileVisibility: z.enum(["public", "private"]).optional(),
  }),
});

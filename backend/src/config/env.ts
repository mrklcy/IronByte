import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  LOG_LEVEL: z.string().default("info"),
  LAB_ORCHESTRATOR: z.enum(["docker", "simulation"]).default("simulation"),
  LAB_DOCKER_IMAGE: z.string().default("trainhack/lab-web:local"),
  LAB_DOCKER_NETWORK: z.string().optional(),
  LAB_PUBLIC_HOST: z.string().default("localhost"),
});

export const env = envSchema.parse(process.env);

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://trainhack:trainhack@localhost:5432/trainhack?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-long-enough";

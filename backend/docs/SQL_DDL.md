# SQL DDL Notes

The complete SQL DDL should be generated from [schema.prisma](../prisma/schema.prisma) to avoid drift between Prisma models and PostgreSQL migrations.

Generate a full SQL script:

```bash
cd backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > docs/trainhack-schema.sql
```

Generate and apply a development migration:

```bash
cd backend
npx prisma migrate dev --name initial_trainhack_database
```

Apply migrations in production:

```bash
cd backend
npx prisma migrate deploy
```

Recommended PostgreSQL extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
```

Recommended operational indexes beyond Prisma defaults can be added in handwritten migration SQL when workload data proves the need, especially partial indexes for unread notifications and active sessions:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notifications_unread
  ON "UserNotification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active
  ON "Session" ("userId", "expiresAt")
  WHERE "revokedAt" IS NULL;
```

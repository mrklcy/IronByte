# TrainHack Backend Architecture

## Request lifecycle

```text
Request
  -> Router
  -> Authentication middleware
  -> Authorization middleware
  -> Validation middleware
  -> Controller
  -> Service
  -> Repository
  -> Prisma ORM
  -> PostgreSQL
  -> Response
```

Controllers translate HTTP input and output only. Services own business rules such as token rotation, XP awards, flag validation, and progress tracking. Repositories isolate Prisma queries.

## Authentication flow

1. `POST /api/v1/auth/register` hashes the password with Argon2 and assigns the `STUDENT` role.
2. `POST /api/v1/auth/login` verifies credentials, records device/session metadata, returns JWT access and opaque refresh tokens.
3. `POST /api/v1/auth/refresh` validates the hashed refresh token and issues a new access token.
4. `POST /api/v1/auth/logout` revokes refresh token/session state.
5. Password reset and change-password flows store only hashed reset tokens.

## Authorization flow

JWT payloads include role names and permission keys. `authenticate` verifies the access token and sets `req.user`. `requireRole` and `requirePermission` guard protected routes. Permissions are database-backed through `Role`, `Permission`, `UserRole`, and `RolePermission`.

## Middleware

- `requestId`: attaches correlation IDs.
- `helmet`, `cors`, `compression`, rate limiting: HTTP hardening.
- `validate`: Zod request validation.
- `authenticate`: JWT validation.
- `authorize`: RBAC and permission checks.
- `errorHandler`: consistent error envelopes and structured logs.

## Validation strategy

DTO files use Zod schemas per route. Parsed body, query, and params replace untrusted request data before controllers execute.

## Error strategy

Domain failures throw `AppError`. Prisma known request errors are normalized. All responses follow:

```json
{ "success": false, "message": "Validation failed.", "errors": [] }
```

## Logging and audit

Pino logs requests, errors, and security-sensitive actions. `AuditLog` stores administrative actions and resource changes. Token, password, and cookie fields are redacted.

## Caching and jobs

Redis is available through `src/cache/redis.ts`. Use cache-aside for leaderboards, course catalogs, and public challenge lists. BullMQ queues are defined for email and achievement processing.

## Production notes

Run Prisma migrations before starting the API. Use different access and refresh secrets, enable secure cookies behind TLS, and set restrictive CORS origins per environment.

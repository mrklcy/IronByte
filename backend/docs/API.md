# TrainHack REST API

Base URL: `/api/v1`

## Response format

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "meta": {}
}
```

## Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`

Protected endpoints use `Authorization: Bearer <accessToken>`.

## Users

- `GET /users/me`
- `GET /users` requires `users:read`

## Learning

- `GET /courses`
- `GET /courses/:slug`

## Labs

- `GET /labs`
- `GET /lab-attempts` requires authentication
- `POST /labs/:slug/start` requires `labs:use`; starts a Docker-backed lab target when `LAB_ORCHESTRATOR=docker`
- `POST /lab-attempts/:id/stop` requires authentication; stops the lab target
- `POST /labs/:slug/flag` requires `labs:use`

## CTF

- `GET /challenges`
- `GET /challenges/:slug`
- `POST /challenges/:slug/submissions` requires `ctf:submit`

## Leaderboards and notifications

- `GET /leaderboard`
- `GET /notifications`

## Administration

- `GET /admin/dashboard` requires `ADMINISTRATOR` and `admin:access`

## Pagination

List endpoints accept:

- `page`
- `pageSize`
- `search`
- `difficulty`
- `status`
- `category`

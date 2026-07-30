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

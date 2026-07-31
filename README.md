# IronByte

IronByte is a full-stack training platform with a Vite/React frontend and an Express/Prisma backend.

## Requirements

- Node.js 22 or newer
- npm
- Docker Desktop, recommended for PostgreSQL and Redis
- Git

## Clone The Repository

```bash
git clone https://github.com/mrklcy/IronByte.git
cd IronByte
```

## Environment Setup

Create `backend/.env` before starting the backend:

```env
NODE_ENV=development
PORT=4000
API_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://trainhack:trainhack@localhost:5432/trainhack?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-this-access-secret-to-at-least-24-characters
JWT_REFRESH_SECRET=change-this-refresh-secret-to-at-least-24-characters
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_VERIFICATION_TTL_HOURS=24
COOKIE_SECURE=false
LOG_LEVEL=info
```

Do not commit `.env` files. They are ignored because they may contain secrets.

## Run Locally

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Install and prepare the backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

In a second terminal, start the frontend:

```bash
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/v1`

## Run With Docker Compose

After creating `backend/.env`, run:

```bash
docker compose up --build
```

Docker exposes:

- Nginx: `http://localhost:8080`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Useful Commands

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

Backend:

```bash
cd backend
npm run dev
npm run build
npm test
npm run prisma:generate
npm run prisma:migrate
```

## GitHub Actions

The repository has a workflow named `Backend CI` in `.github/workflows/backend-ci.yml`. It runs on pushes to `main` and checks the backend install, Prisma generation, TypeScript build, and tests.

If GitHub Actions shows a failure saying the account is locked due to a billing issue, the code did not run. Fix the GitHub account billing/settings issue first, then rerun the workflow.

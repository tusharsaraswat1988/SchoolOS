# SchoolOS — Local Setup Guide

SchoolOS is a **pnpm monorepo** with:

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui |
| API | Express 5 (esbuild bundle) |
| Database | PostgreSQL + Drizzle ORM |
| Package manager | pnpm workspaces |

---

## Prerequisites

- **Node.js** 22+ (24 recommended; repo targets Node 24 on Replit)
- **pnpm** 10+ (`npm install -g pnpm`)
- **PostgreSQL** database (Neon or local)

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required — PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Required — session signing secret (reserved for future session middleware)
SESSION_SECRET=your-random-secret-at-least-32-chars

# API server port (Express)
API_PORT=5000

# Frontend port (Vite dev/preview server)
PORT=5173

# Vite public path (use "/" for local development)
BASE_PATH=/

# development | production
NODE_ENV=development

# Optional — API log level: debug | info | warn | error
LOG_LEVEL=info

# Optional — Cloudinary media storage (required for photo/file uploads)
# See reports/cloudinary-setup.md for full setup
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle ORM and the API server |
| `SESSION_SECRET` | Yes | Cryptographic secret for sessions (documented in Replit stack; not yet wired in Express) |
| `API_PORT` | No | Documented API port; the `dev:api` / `start:api` scripts set `PORT=5000` explicitly |
| `PORT` | Yes (frontend) | Port for the Vite dev/preview server (default `5173` in vite config) |
| `BASE_PATH` | Yes (frontend) | URL base path for Vite assets (default `/`) |
| `NODE_ENV` | No | `development` for dev, `production` for builds/runtime |
| `LOG_LEVEL` | No | Pino log verbosity for the API server |
| `CLOUDINARY_CLOUD_NAME` | No* | Cloudinary cloud name for media uploads |
| `CLOUDINARY_API_KEY` | No* | Cloudinary API key (server-side only) |
| `CLOUDINARY_API_SECRET` | No* | Cloudinary API secret (server-side only) |

\* Required when using photo or attachment uploads. See [reports/cloudinary-setup.md](./reports/cloudinary-setup.md).

---

## Install Steps

```bash
# 1. Clone the repository
git clone https://github.com/tusharsaraswat1988/SchoolOS.git
cd SchoolOS

# 2. Install dependencies (pnpm only)
pnpm install

# 3. If pnpm blocks native build scripts (esbuild), approve them:
pnpm approve-builds --all
pnpm install

# 4. Create .env (see Environment Variables above)

# 5. Push database schema to PostgreSQL
pnpm run db:push

# 6. Verify database connectivity
pnpm run db:verify
```

---

## Database / Migration Commands

This project uses **Drizzle Kit push** (no SQL migration files in the repo):

```bash
# Apply schema to the database (development)
pnpm run db:push

# Force push (use with caution)
pnpm --filter @workspace/db run push-force

# Verify connection
pnpm run db:verify
```

Schema lives in `lib/db/src/schema/`.

---

## Development

Starts **both** the API server (port 5000) and the Vite frontend (port 5173). The frontend proxies `/api` requests to the API.

```bash
pnpm dev
```

Open: **http://localhost:5173**

Individual services:

```bash
pnpm run dev:api   # API only — http://localhost:5000
pnpm run dev:web   # Frontend only — http://localhost:5173
```

---

## Production Build

```bash
pnpm build
```

Builds:

- `@workspace/api-server` → `artifacts/api-server/dist/`
- `@workspace/school-os` → `artifacts/school-os/dist/public/`

---

## Production Start

```bash
pnpm build && pnpm start
```

Or separately:

```bash
pnpm start          # API + Vite preview
pnpm run start:api  # API only
pnpm run start:web  # Frontend preview (proxies /api → :5000)
```

---

## Troubleshooting

### `Use pnpm instead` during install

This repo enforces pnpm. Run `pnpm install`, not `npm install` or `yarn`.

### `DATABASE_URL must be set`

- Ensure `.env` exists at the project root.
- The API loads it via `node --env-file=../../.env` when started from `artifacts/api-server`.
- For Drizzle push, `lib/db/drizzle.config.ts` loads the root `.env`.

### `Cannot find module @rollup/rollup-win32-x64-msvc` (Windows)

The original Replit config excluded Windows native binaries. If you see this after a fresh clone, ensure `pnpm-workspace.yaml` does **not** override/exclude `win32` platform packages, then reinstall:

```bash
Remove-Item -Recurse -Force node_modules
pnpm install
```

### `pnpm approve-builds` / esbuild build scripts blocked

```bash
pnpm approve-builds --all
pnpm install
```

### API returns empty data / zeros on dashboard

The database schema is pushed but **demo seed data is not included** in the repository. The login page uses simulated client-side auth; API data requires schools/students seeded manually or via the UI.

### Port already in use

Change ports in `.env` and the root `package.json` scripts (`dev:api`, `dev:web`, `start:api`, `start:web`).

### SSL warning from `pg` driver

Neon requires SSL. The warning about `sslmode=require` vs `verify-full` is informational; the connection still works.

### Typecheck errors in `mockup-sandbox`

The main app build targets only `api-server` and `school-os`. The `mockup-sandbox` artifact is a separate Replit tool and is not required for SchoolOS.

---

## Architecture (local)

```
Browser → http://localhost:5173 (Vite)
              ↓ proxy /api/*
         http://localhost:5000 (Express API)
              ↓
         PostgreSQL (DATABASE_URL)
```

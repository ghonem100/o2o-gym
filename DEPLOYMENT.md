# O2O Gym — Deployment Guide

Production stack:

| Layer | Service | Notes |
|-------|---------|-------|
| Database | **Supabase** (managed PostgreSQL) | free tier, auto backups |
| Cache/Queue | **Upstash** (serverless Redis) | optional for MVP |
| Backend API | **Railway.app** | Docker deploy |
| Frontend | **Vercel** | Next.js native |
| Images | **Cloudinary** | member photos |
| Messaging | **WhatsApp Business API** + **Twilio SMS** | renewal reminders |

---

## 1. Environment Variables

### Backend (Railway)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | Supabase **pooled** connection string (Prisma). Append `?pgbouncer=true&connection_limit=1` | `postgresql://postgres.xxx:[PWD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | ⬜ | Supabase **direct** connection (port 5432) for migrations, if you run `prisma migrate` instead of `db push` | `postgresql://postgres.xxx:[PWD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres` |
| `PORT` | auto | Railway injects this; app falls back to 5000 | `5000` |
| `NODE_ENV` | ✅ | `production` | `production` |
| `JWT_SECRET` | ✅ | Long random string (32+ chars). Generate: `openssl rand -base64 48` | `xZ9...` |
| `JWT_EXPIRES_IN` | ⬜ | Token lifetime (app hardcodes 8h if unset) | `8h` |
| `REDIS_URL` | ⬜ | Upstash `rediss://` URL (TLS). Optional — app starts without it | `rediss://default:[PWD]@xxx.upstash.io:6379` |
| `FRONTEND_URL` | ✅ | Vercel URL — used for CORS | `https://o2o-gym.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | ⬜* | Cloudinary cloud name | `dxxxxx` |
| `CLOUDINARY_API_KEY` | ⬜* | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | ⬜* | Cloudinary API secret | `abcdef...` |
| `WHATSAPP_API_URL` | ⬜ | Graph API base (defaults to `https://graph.facebook.com/v21.0`) | |
| `WHATSAPP_TOKEN` | ⬜** | WhatsApp Business permanent access token | `EAAG...` |
| `WHATSAPP_PHONE_ID` | ⬜** | WhatsApp Business phone number ID | `109...` |
| `TWILIO_ACCOUNT_SID` | ⬜ | Twilio SID (SMS fallback) | `AC...` |
| `TWILIO_AUTH_TOKEN` | ⬜ | Twilio auth token | |
| `TWILIO_PHONE_NUMBER` | ⬜ | Twilio sender number (E.164) | `+1xxx` |
| `INITIAL_GYM_NAME` | seed | Used only by `npm run db:seed` | `O2O Gym` |
| `INITIAL_GYM_CITY` | seed | | `El-Menoufia` |
| `INITIAL_OWNER_USERNAME` | seed | First owner login | `admin` |
| `INITIAL_OWNER_PASSWORD` | seed | **Change after first login** | `Admin@123` |
| `INITIAL_OWNER_FULLNAME` | seed | | `System Owner` |

\* Without Cloudinary vars, photo upload returns HTTP 503 (rest of app works).
\** Without WhatsApp/Twilio vars, reminders are logged as `failed` (dedup + history still work).

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend base URL **including `/api/v1`** | `https://o2o-gym-api.up.railway.app/api/v1` |

---

## 2. Deployment Order

Deploy bottom-up so each layer's URL is ready for the next.

### Step 1 — Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com) → choose a region near Egypt (e.g. `eu-central-1`).
2. Set a strong database password (save it).
3. **Create the schema:** open the Supabase **SQL Editor** → paste the entire contents of [`backend/prisma/migration.sql`](backend/prisma/migration.sql) → Run. This creates all 12 tables, enums, and indexes.
   (We deliberately do **not** run `prisma db push` at boot — DDL through the pooled pgBouncer connection is unreliable. If you prefer migration-managed schema, run `prisma migrate deploy` locally against `DIRECT_URL`.)
4. Grab the connection strings: Project Settings → Database → Connection string → **URI**.
   - Use the **Connection pooling** string (port `6543`) for `DATABASE_URL`, and append `?pgbouncer=true&connection_limit=1`.
   - Use the **direct** string (port `5432`) for `DIRECT_URL` if you run migrations.

### Step 2 — Redis (Upstash) — optional

1. Create a database at [upstash.com](https://upstash.com) (Global or a region near Egypt).
2. Copy the **`rediss://` URL** (TLS) from the "ioredis" / connection tab → set as `REDIS_URL`.
   - The app auto-enables TLS for `rediss://`. Skip this layer entirely for MVP if desired.

### Step 3 — Backend (Railway)

1. New Project → Deploy from GitHub repo → select the repo, set **root directory** to `backend/`.
   (Railway auto-detects `Dockerfile` and `railway.toml`.)
2. Add all backend env vars from the table above (at minimum: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URL`).
3. Deploy. Railway builds the Docker image, runs `prisma db push`, then starts the server.
4. Health check: `https://<app>.up.railway.app/health` → `{"status":"ok"}`.
5. **Seed the first owner + plans** (one-time, idempotent): open the Railway service shell and run the production seed (plain Node — no dev deps needed):
   ```bash
   npm run db:seed:prod
   ```
   Or run it locally with `DATABASE_URL` pointed at Supabase. (`npm run db:seed` uses ts-node and only works in a dev environment.)
6. Copy the public Railway domain — you need it for the frontend.

### Step 4 — Frontend (Vercel)

1. New Project → import the repo → set **root directory** to `frontend/`.
2. Framework preset: **Next.js** (auto). `vercel.json` is already present.
3. Add env var `NEXT_PUBLIC_API_URL` = `https://<railway-app>.up.railway.app/api/v1`.
4. Deploy → note the Vercel URL.

### Step 5 — Wire CORS

1. Set the backend `FRONTEND_URL` (Railway) to the Vercel URL and redeploy the backend.

---

## 3. Post-Deployment Checklist

- [ ] `GET /health` returns `{"status":"ok"}` on the Railway domain.
- [ ] Open the Vercel URL → login page loads in Arabic (RTL).
- [ ] Log in as `admin` → owner lands on **Dashboard**; KPIs render (not all zero after seeding test data).
- [ ] **Change the owner password** immediately (`/auth/change-password` or the UI).
- [ ] Create a member → barcode is generated; if Cloudinary is set, photo uploads.
- [ ] Create a subscription → appears under the member; a payment row is logged.
- [ ] Open `/attendance` kiosk → camera permission prompt appears (HTTPS required — Vercel provides it).
  - [ ] Download face-api models into `frontend/public/models` (see that folder's README) **before** building, or face match stays disabled and only barcode/manual work.
- [ ] Barcode check-in works; second same-day check-in returns "already checked in".
- [ ] Settings → send a test reminder; confirm it appears in Notification History.
  - [ ] If WhatsApp/Twilio creds set, confirm a real message is delivered.
- [ ] Log in as a receptionist → `/analytics`, `/payments`, `/expenses`, `/settings` are hidden and return 403 if hit directly.
- [ ] Confirm the daily 10:00 Africa/Cairo reminder cron is running (Railway logs: "Reminder scheduler started").
- [ ] Set up a Railway/Supabase backup schedule and confirm Supabase auto-backups are on.

---

## 4. Notes & Gotchas

- **Prisma 7** reads its datasource URL from `backend/prisma.config.ts` (which reads `DATABASE_URL`). The schema file has no inline `url`.
- **Migrations vs. push:** `railway.toml` uses `prisma db push` (schema sync, no migration history). For audited migrations, run `prisma migrate deploy` against `DIRECT_URL` instead and remove `db push` from `startCommand`.
- **Camera/HTTPS:** face recognition (`getUserMedia`) only works over HTTPS or `localhost`. Vercel is HTTPS by default. `vercel.json` sets `Permissions-Policy: camera=(self)`.
- **Pooled connection:** always use the Supabase **pooled** (`6543`) string for the running app to avoid exhausting connections; use the direct (`5432`) string only for migrations.
- **Secrets:** never commit `.env`. Both `backend/.gitignore` and `frontend/.gitignore` already exclude it. Rotate `JWT_SECRET` and the seeded owner password for production.

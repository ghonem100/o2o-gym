# O2O Gym Management System

Professional gym management system for **O2O Gym**, El-Menoufia, Egypt.

Monorepo with a Node.js/Express/Prisma backend and a Next.js 14 frontend.

## Structure

```
o2o-gym/
├── backend/      # Node.js + Express + TypeScript + Prisma + PostgreSQL
├── frontend/     # Next.js 14 + TypeScript + Tailwind + shadcn/ui + i18next
└── docker-compose.yml   # PostgreSQL + Redis for local dev
```

## Quick start

### 1. Infrastructure
```bash
docker-compose up -d        # PostgreSQL :5432, Redis :6379
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # (already created with dev defaults)
npm install
npm run db:push             # apply Prisma schema
npm run db:seed             # gym + owner (admin / Admin@123) + 5 plans
npm run dev                 # http://localhost:5000/api/v1
```

### 3. Frontend
```bash
cd frontend
npm install
# (optional) download face-api models into public/models — see its README
npm run dev                 # http://localhost:3000
```

Default login: **admin / Admin@123**

## Roles
- **Owner** — full access: dashboard, analytics, payments, expenses, settings.
- **Receptionist** — attendance kiosk, members list, new subscription only.

## Key screens
- `/attendance` — full-screen kiosk; always-on face camera + USB barcode + manual check-in.
- `/dashboard` — owner KPIs: revenue chart, peak-hours heatmap, retention, active members, daily cash.
- `/members` — searchable member directory with add dialog.
- `/subscriptions/new` — two-step new-subscription + payment flow.

Arabic (RTL) is the default language; English toggle in the UI.

-- SaaS layer: tenant status, slug routing, tenant payments, super_admin role.

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('trial', 'active', 'suspended', 'cancelled');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'super_admin';

-- users.gym_id becomes nullable (super_admin has no gym)
ALTER TABLE "users" DROP CONSTRAINT "users_gym_id_fkey";
ALTER TABLE "users" ALTER COLUMN "gym_id" DROP NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- gyms: SaaS columns. slug is added nullable first, backfilled, then locked NOT NULL.
ALTER TABLE "gyms" ADD COLUMN "monthly_fee" DECIMAL(10,2),
ADD COLUMN "slug" VARCHAR(50),
ADD COLUMN "subscription_ends_at" TIMESTAMPTZ,
ADD COLUMN "subscription_status" "TenantStatus" NOT NULL DEFAULT 'trial',
ADD COLUMN "tenant_notes" TEXT;

-- Backfill slug for existing gyms: slugified name, deduped with a short id suffix.
UPDATE "gyms"
SET "slug" = trim(both '-' from lower(regexp_replace(coalesce(nullif("name", ''), 'gym'), '[^a-zA-Z0-9]+', '-', 'g')))
WHERE "slug" IS NULL;

UPDATE "gyms" g
SET "slug" = left(g."slug", 40) || '-' || left(replace(g."id", '-', ''), 6)
WHERE g."slug" = '' OR EXISTS (
  SELECT 1 FROM "gyms" other
  WHERE other."slug" = g."slug" AND other."id" < g."id"
);

-- Existing gyms were paying customers before the SaaS layer: mark them active.
UPDATE "gyms" SET "subscription_status" = 'active' WHERE "subscription_status" = 'trial';

ALTER TABLE "gyms" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "tenant_payments" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_payments_gym_id_month_idx" ON "tenant_payments"("gym_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "gyms_slug_key" ON "gyms"("slug");

-- AddForeignKey
ALTER TABLE "tenant_payments" ADD CONSTRAINT "tenant_payments_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

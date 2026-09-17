-- W4 Analytics & Conversion Intelligence
ALTER TABLE "storefront_events" ADD COLUMN IF NOT EXISTS "landing_path" TEXT;
ALTER TABLE "storefront_events" ADD COLUMN IF NOT EXISTS "consent_state" TEXT;
ALTER TABLE "storefront_events" ADD COLUMN IF NOT EXISTS "experiment_id" TEXT;
ALTER TABLE "storefront_events" ADD COLUMN IF NOT EXISTS "variant_key" TEXT;

CREATE INDEX IF NOT EXISTS "storefront_events_tenant_id_storefront_id_landing_path_idx"
  ON "storefront_events"("tenant_id", "storefront_id", "landing_path");

CREATE TABLE IF NOT EXISTS "experiments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metric" TEXT NOT NULL DEFAULT 'purchase_cvr',
  "variants" JSONB NOT NULL DEFAULT '[]',
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cwv_snapshots" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'synthetic',
  "path" TEXT NOT NULL DEFAULT '/',
  "device" TEXT NOT NULL DEFAULT 'mobile',
  "lcp_ms" DOUBLE PRECISION NOT NULL,
  "inp_ms" DOUBLE PRECISION,
  "cls" DOUBLE PRECISION,
  "publish_job_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cwv_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_actions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT,
  "kind" TEXT NOT NULL,
  "risk" TEXT NOT NULL DEFAULT 'low',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB NOT NULL DEFAULT '{}',
  "requested_by" TEXT,
  "reviewed_by" TEXT,
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "analytics_incidents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warn',
  "status" TEXT NOT NULL DEFAULT 'open',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "publish_job_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "analytics_incidents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "experiments_storefront_id_code_key" ON "experiments"("storefront_id", "code");
CREATE INDEX IF NOT EXISTS "experiments_tenant_id_storefront_id_status_idx" ON "experiments"("tenant_id", "storefront_id", "status");
CREATE INDEX IF NOT EXISTS "cwv_snapshots_tenant_id_storefront_id_created_at_idx" ON "cwv_snapshots"("tenant_id", "storefront_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_actions_tenant_id_status_risk_idx" ON "ai_actions"("tenant_id", "status", "risk");
CREATE INDEX IF NOT EXISTS "analytics_incidents_tenant_id_storefront_id_status_idx" ON "analytics_incidents"("tenant_id", "storefront_id", "status");

DO $$ BEGIN
  ALTER TABLE "experiments" ADD CONSTRAINT "experiments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "experiments" ADD CONSTRAINT "experiments_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "cwv_snapshots" ADD CONSTRAINT "cwv_snapshots_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "cwv_snapshots" ADD CONSTRAINT "cwv_snapshots_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "analytics_incidents" ADD CONSTRAINT "analytics_incidents_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "analytics_incidents" ADD CONSTRAINT "analytics_incidents_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- C3: RFM scores on customers + segments / rules / memberships + RFM job runs

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_r" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_f" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_m" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_score" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_segment" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "rfm_computed_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "customers_tenant_id_rfm_segment_idx"
  ON "customers"("tenant_id", "rfm_segment");

CREATE TABLE IF NOT EXISTS "rfm_job_runs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "customers_scored" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL DEFAULT '{}',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfm_job_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "rfm_job_runs_tenant_id_started_at_idx"
  ON "rfm_job_runs"("tenant_id", "started_at");
DO $$ BEGIN
  ALTER TABLE "rfm_job_runs" ADD CONSTRAINT "rfm_job_runs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "segments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "logic" TEXT NOT NULL DEFAULT 'AND',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "member_count" INTEGER NOT NULL DEFAULT 0,
  "last_materialized_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "segments_tenant_id_name_key" ON "segments"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "segments_tenant_id_status_idx" ON "segments"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "segments" ADD CONSTRAINT "segments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "segment_rules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "segment_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "op" TEXT NOT NULL,
  "value" JSONB NOT NULL DEFAULT 'null',
  "window_days" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "segment_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "segment_rules_tenant_id_segment_id_idx"
  ON "segment_rules"("tenant_id", "segment_id");
DO $$ BEGIN
  ALTER TABLE "segment_rules" ADD CONSTRAINT "segment_rules_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "segment_rules" ADD CONSTRAINT "segment_rules_segment_id_fkey"
    FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "segment_memberships" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "segment_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "segment_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "segment_memberships_segment_id_customer_id_key"
  ON "segment_memberships"("segment_id", "customer_id");
CREATE INDEX IF NOT EXISTS "segment_memberships_tenant_id_segment_id_idx"
  ON "segment_memberships"("tenant_id", "segment_id");
CREATE INDEX IF NOT EXISTS "segment_memberships_tenant_id_customer_id_idx"
  ON "segment_memberships"("tenant_id", "customer_id");
DO $$ BEGIN
  ALTER TABLE "segment_memberships" ADD CONSTRAINT "segment_memberships_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "segment_memberships" ADD CONSTRAINT "segment_memberships_segment_id_fkey"
    FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "segment_memberships" ADD CONSTRAINT "segment_memberships_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

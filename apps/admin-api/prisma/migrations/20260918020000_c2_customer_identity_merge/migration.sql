-- C2: Customer identity resolution + match queue + merge audit

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "merged_into_id" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "merged_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "customers_tenant_id_merged_into_id_idx"
  ON "customers"("tenant_id", "merged_into_id");

CREATE TABLE IF NOT EXISTS "customer_identities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "normalized_value" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_identities_tenant_id_type_normalized_value_key"
  ON "customer_identities"("tenant_id", "type", "normalized_value");
CREATE INDEX IF NOT EXISTS "customer_identities_tenant_id_customer_id_idx"
  ON "customer_identities"("tenant_id", "customer_id");
CREATE INDEX IF NOT EXISTS "customer_identities_tenant_id_normalized_value_idx"
  ON "customer_identities"("tenant_id", "normalized_value");
DO $$ BEGIN
  ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "customer_match_candidates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "left_customer_id" TEXT NOT NULL,
  "right_customer_id" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 50,
  "signals" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_match_candidates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_match_candidates_tenant_id_left_customer_id_right_customer_id_key"
  ON "customer_match_candidates"("tenant_id", "left_customer_id", "right_customer_id");
CREATE INDEX IF NOT EXISTS "customer_match_candidates_tenant_id_status_score_idx"
  ON "customer_match_candidates"("tenant_id", "status", "score");
DO $$ BEGIN
  ALTER TABLE "customer_match_candidates" ADD CONSTRAINT "customer_match_candidates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "customer_match_candidates" ADD CONSTRAINT "customer_match_candidates_left_customer_id_fkey"
    FOREIGN KEY ("left_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "customer_match_candidates" ADD CONSTRAINT "customer_match_candidates_right_customer_id_fkey"
    FOREIGN KEY ("right_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "customer_merge_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "survivor_id" TEXT NOT NULL,
  "merged_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'merged',
  "reason" TEXT NOT NULL DEFAULT '',
  "before_snapshot" JSONB NOT NULL DEFAULT '{}',
  "after_snapshot" JSONB NOT NULL DEFAULT '{}',
  "actor_id" TEXT,
  "merged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unmerged_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_merge_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customer_merge_events_tenant_id_status_merged_at_idx"
  ON "customer_merge_events"("tenant_id", "status", "merged_at");
CREATE INDEX IF NOT EXISTS "customer_merge_events_tenant_id_survivor_id_idx"
  ON "customer_merge_events"("tenant_id", "survivor_id");
CREATE INDEX IF NOT EXISTS "customer_merge_events_tenant_id_merged_id_idx"
  ON "customer_merge_events"("tenant_id", "merged_id");
DO $$ BEGIN
  ALTER TABLE "customer_merge_events" ADD CONSTRAINT "customer_merge_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "customer_merge_events" ADD CONSTRAINT "customer_merge_events_survivor_id_fkey"
    FOREIGN KEY ("survivor_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "customer_merge_events" ADD CONSTRAINT "customer_merge_events_merged_id_fkey"
    FOREIGN KEY ("merged_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

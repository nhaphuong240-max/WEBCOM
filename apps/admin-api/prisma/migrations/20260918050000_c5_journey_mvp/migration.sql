-- C5: Journey orchestration — definition, steps, enrollments, run logs

CREATE TABLE IF NOT EXISTS "journeys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'retention',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "trigger_type" TEXT NOT NULL DEFAULT 'manual',
  "trigger_config" JSONB NOT NULL DEFAULT '{}',
  "required_consent" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "frequency_cap_days" INTEGER NOT NULL DEFAULT 7,
  "frequency_cap_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "journeys_tenant_id_name_key" ON "journeys"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "journeys_tenant_id_status_category_idx" ON "journeys"("tenant_id", "status", "category");
DO $$ BEGIN
  ALTER TABLE "journeys" ADD CONSTRAINT "journeys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "journey_steps" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "journey_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "kind" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journey_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "journey_steps_tenant_id_journey_id_sort_order_idx"
  ON "journey_steps"("tenant_id", "journey_id", "sort_order");
DO $$ BEGIN
  ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_journey_id_fkey"
    FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "journey_enrollments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "journey_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "current_step_id" TEXT,
  "waiting_until" TIMESTAMP(3),
  "block_reason" TEXT,
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "last_action_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "journey_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "journey_enrollments_tenant_id_journey_id_status_idx"
  ON "journey_enrollments"("tenant_id", "journey_id", "status");
CREATE INDEX IF NOT EXISTS "journey_enrollments_tenant_id_customer_id_status_idx"
  ON "journey_enrollments"("tenant_id", "customer_id", "status");
CREATE INDEX IF NOT EXISTS "journey_enrollments_tenant_id_status_waiting_until_idx"
  ON "journey_enrollments"("tenant_id", "status", "waiting_until");
DO $$ BEGIN
  ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_journey_id_fkey"
    FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_current_step_id_fkey"
    FOREIGN KEY ("current_step_id") REFERENCES "journey_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "journey_run_logs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "enrollment_id" TEXT NOT NULL,
  "step_id" TEXT,
  "status" TEXT NOT NULL,
  "message" TEXT NOT NULL DEFAULT '',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journey_run_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "journey_run_logs_tenant_id_enrollment_id_created_at_idx"
  ON "journey_run_logs"("tenant_id", "enrollment_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "journey_run_logs" ADD CONSTRAINT "journey_run_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_run_logs" ADD CONSTRAINT "journey_run_logs_enrollment_id_fkey"
    FOREIGN KEY ("enrollment_id") REFERENCES "journey_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "journey_run_logs" ADD CONSTRAINT "journey_run_logs_step_id_fkey"
    FOREIGN KEY ("step_id") REFERENCES "journey_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A4: Temporal workflow metadata on publish jobs
ALTER TABLE "publish_jobs" ADD COLUMN IF NOT EXISTS "workflow_id" TEXT;
ALTER TABLE "publish_jobs" ADD COLUMN IF NOT EXISTS "workflow_run_id" TEXT;
ALTER TABLE "publish_jobs" ADD COLUMN IF NOT EXISTS "engine" TEXT NOT NULL DEFAULT 'in_process';
ALTER TABLE "publish_jobs" ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "publish_jobs_workflow_id_idx" ON "publish_jobs"("workflow_id");

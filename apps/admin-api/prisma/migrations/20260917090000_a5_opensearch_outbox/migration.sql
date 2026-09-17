-- A5: Search outbox for OpenSearch product index sync
CREATE TABLE IF NOT EXISTS "search_outbox" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "op" TEXT NOT NULL DEFAULT 'upsert',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "search_outbox_status_created_at_idx"
  ON "search_outbox"("status", "created_at");
CREATE INDEX IF NOT EXISTS "search_outbox_tenant_id_aggregate_id_idx"
  ON "search_outbox"("tenant_id", "aggregate_id");

DO $$ BEGIN
  ALTER TABLE "search_outbox" ADD CONSTRAINT "search_outbox_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

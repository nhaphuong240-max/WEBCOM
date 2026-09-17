-- C6: Service recovery tickets + NBA recommendations

CREATE TABLE IF NOT EXISTS "service_tickets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "order_id" TEXT,
  "conversation_id" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "playbook_code" TEXT,
  "trigger_type" TEXT,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "owner_id" TEXT,
  "care_reply_draft" TEXT,
  "ai_action_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "service_tickets_tenant_id_status_priority_idx"
  ON "service_tickets"("tenant_id", "status", "priority");
CREATE INDEX IF NOT EXISTS "service_tickets_tenant_id_customer_id_idx"
  ON "service_tickets"("tenant_id", "customer_id");
CREATE INDEX IF NOT EXISTS "service_tickets_tenant_id_playbook_code_idx"
  ON "service_tickets"("tenant_id", "playbook_code");
DO $$ BEGIN
  ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "nba_recommendations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "ticket_id" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "expected_outcome" TEXT NOT NULL DEFAULT '',
  "estimated_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "owner_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'suggested',
  "ai_action_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "applied_at" TIMESTAMP(3),
  CONSTRAINT "nba_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "nba_recommendations_tenant_id_customer_id_status_idx"
  ON "nba_recommendations"("tenant_id", "customer_id", "status");
CREATE INDEX IF NOT EXISTS "nba_recommendations_tenant_id_status_idx"
  ON "nba_recommendations"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "nba_recommendations" ADD CONSTRAINT "nba_recommendations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "nba_recommendations" ADD CONSTRAINT "nba_recommendations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "nba_recommendations" ADD CONSTRAINT "nba_recommendations_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

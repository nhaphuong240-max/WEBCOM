-- A6: AI action cost metadata + tenant budget ledger
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "cost_usd" DECIMAL(12,6);
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "prompt_tokens" INTEGER;
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "completion_tokens" INTEGER;
ALTER TABLE "ai_actions" ADD COLUMN IF NOT EXISTS "gateway_request_id" TEXT;

CREATE TABLE IF NOT EXISTS "ai_budget_ledgers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "period_ym" TEXT NOT NULL,
  "spent_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "cap_usd" DECIMAL(12,6) NOT NULL DEFAULT 5,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_budget_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_budget_ledgers_tenant_id_period_ym_key"
  ON "ai_budget_ledgers"("tenant_id", "period_ym");
CREATE INDEX IF NOT EXISTS "ai_budget_ledgers_tenant_id_idx"
  ON "ai_budget_ledgers"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "ai_budget_ledgers" ADD CONSTRAINT "ai_budget_ledgers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

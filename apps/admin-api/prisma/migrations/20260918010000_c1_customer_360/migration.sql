-- C1: Customer 360 profile fields + inbox customer index

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "consent_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "consent_sms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "consent_zns" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "consent_messenger" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "addresses" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lifetime_orders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lifetime_spend" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "last_order_at" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "customers_tenant_id_status_idx" ON "customers"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "inbox_conversations_tenant_id_customer_id_idx"
  ON "inbox_conversations"("tenant_id", "customer_id");

DO $$ BEGIN
  ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

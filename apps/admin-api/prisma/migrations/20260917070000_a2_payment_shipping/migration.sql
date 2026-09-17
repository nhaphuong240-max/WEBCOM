-- A2: Payment intents, webhook inbox, order shipping/voucher fields
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_service" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "voucher_code" TEXT;

CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'vietqr',
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "status" TEXT NOT NULL DEFAULT 'requires_payment',
  "qr_payload" TEXT,
  "qr_image_url" TEXT,
  "provider_ref" TEXT,
  "transfer_content" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_tenant_id_provider_ref_key"
  ON "payment_intents"("tenant_id", "provider_ref");
CREATE INDEX IF NOT EXISTS "payment_intents_tenant_id_order_id_idx"
  ON "payment_intents"("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "payment_intents_tenant_id_status_idx"
  ON "payment_intents"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "provider" TEXT NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processed',
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_provider_event_id_key"
  ON "webhook_events"("provider", "provider_event_id");
CREATE INDEX IF NOT EXISTS "webhook_events_tenant_id_provider_idx"
  ON "webhook_events"("tenant_id", "provider");

DO $$ BEGIN
  ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

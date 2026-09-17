-- B2: Social order draft (comment/chat → OMS) + order channel attribution

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "attribution_channel" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "attribution_thread_id" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "attribution_provider" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "social_draft_id" TEXT;

CREATE INDEX IF NOT EXISTS "orders_tenant_id_social_draft_id_idx"
  ON "orders"("tenant_id", "social_draft_id");

CREATE TABLE IF NOT EXISTS "social_order_drafts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "message_id" TEXT,
  "channel_account_id" TEXT NOT NULL,
  "external_thread_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'chat',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "risk_score" INTEGER NOT NULL DEFAULT 0,
  "risk_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "contact_name" TEXT NOT NULL DEFAULT '',
  "contact_phone" TEXT NOT NULL DEFAULT '',
  "shipping_name" TEXT NOT NULL DEFAULT '',
  "shipping_phone" TEXT NOT NULL DEFAULT '',
  "shipping_address" TEXT NOT NULL DEFAULT '',
  "shipping_city" TEXT NOT NULL DEFAULT '',
  "payment_method" TEXT NOT NULL DEFAULT 'COD',
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "subtotal_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lines_snapshot" JSONB NOT NULL DEFAULT '[]',
  "source_context" JSONB NOT NULL DEFAULT '{}',
  "messenger_cart" JSONB,
  "cart_id" TEXT,
  "order_id" TEXT,
  "note" TEXT NOT NULL DEFAULT '',
  "created_by" TEXT,
  "converted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "social_order_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "social_order_drafts_order_id_key"
  ON "social_order_drafts"("order_id");
CREATE INDEX IF NOT EXISTS "social_order_drafts_tenant_id_status_created_at_idx"
  ON "social_order_drafts"("tenant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "social_order_drafts_tenant_id_conversation_id_idx"
  ON "social_order_drafts"("tenant_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "social_order_drafts_tenant_id_external_thread_id_idx"
  ON "social_order_drafts"("tenant_id", "external_thread_id");

DO $$ BEGIN
  ALTER TABLE "social_order_drafts" ADD CONSTRAINT "social_order_drafts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "social_order_drafts" ADD CONSTRAINT "social_order_drafts_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "inbox_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "social_order_drafts" ADD CONSTRAINT "social_order_drafts_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

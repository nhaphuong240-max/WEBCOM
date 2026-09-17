-- B4: Live Commerce — session / items / comments / alerts

CREATE TABLE IF NOT EXISTS "live_sessions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "channel_account_id" TEXT,
  "title" TEXT NOT NULL,
  "host_name" TEXT NOT NULL DEFAULT '',
  "platform" TEXT NOT NULL DEFAULT 'meta',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "script_notes" TEXT NOT NULL DEFAULT '',
  "gmv_target" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "gmv_actual" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "viewers_peak" INTEGER NOT NULL DEFAULT 0,
  "viewers_current" INTEGER NOT NULL DEFAULT 0,
  "orders_count" INTEGER NOT NULL DEFAULT 0,
  "comments_count" INTEGER NOT NULL DEFAULT 0,
  "stock_alert_threshold" INTEGER NOT NULL DEFAULT 5,
  "scheduled_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "live_sessions_tenant_id_status_created_at_idx"
  ON "live_sessions"("tenant_id", "status", "created_at");
DO $$ BEGIN
  ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "live_session_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "sku_id" TEXT NOT NULL,
  "product_title" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "deal_price" DECIMAL(18,2),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "orders_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_session_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "live_session_items_session_id_keyword_key"
  ON "live_session_items"("session_id", "keyword");
CREATE INDEX IF NOT EXISTS "live_session_items_tenant_id_session_id_idx"
  ON "live_session_items"("tenant_id", "session_id");
CREATE INDEX IF NOT EXISTS "live_session_items_session_id_sku_id_idx"
  ON "live_session_items"("session_id", "sku_id");
DO $$ BEGIN
  ALTER TABLE "live_session_items" ADD CONSTRAINT "live_session_items_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "live_comments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "external_id" TEXT,
  "author_name" TEXT NOT NULL DEFAULT '',
  "author_handle" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "matched_keyword" TEXT,
  "matched_item_id" TEXT,
  "conversation_id" TEXT,
  "draft_id" TEXT,
  "order_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_comments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "live_comments_session_id_external_id_key"
  ON "live_comments"("session_id", "external_id");
CREATE INDEX IF NOT EXISTS "live_comments_tenant_id_session_id_created_at_idx"
  ON "live_comments"("tenant_id", "session_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "live_alerts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "message" TEXT NOT NULL,
  "sku_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "live_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "live_alerts_tenant_id_session_id_resolved_idx"
  ON "live_alerts"("tenant_id", "session_id", "resolved");
CREATE INDEX IF NOT EXISTS "live_alerts_tenant_id_type_created_at_idx"
  ON "live_alerts"("tenant_id", "type", "created_at");
DO $$ BEGIN
  ALTER TABLE "live_alerts" ADD CONSTRAINT "live_alerts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "live_alerts" ADD CONSTRAINT "live_alerts_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B5: Marketplace connector #1 (Shopee) — account / listing / order / outbox

CREATE TABLE IF NOT EXISTS "marketplace_accounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT,
  "platform" TEXT NOT NULL DEFAULT 'shopee',
  "shop_id" TEXT NOT NULL,
  "shop_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "credentials" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "connected_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_accounts_tenant_id_platform_shop_id_key"
  ON "marketplace_accounts"("tenant_id", "platform", "shop_id");
CREATE INDEX IF NOT EXISTS "marketplace_accounts_tenant_id_status_idx"
  ON "marketplace_accounts"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "marketplace_accounts" ADD CONSTRAINT "marketplace_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "marketplace_listings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "sku_id" TEXT NOT NULL,
  "external_item_id" TEXT NOT NULL,
  "external_sku" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "price_remote" DECIMAL(18,2),
  "stock_remote" INTEGER NOT NULL DEFAULT 0,
  "stock_local" INTEGER NOT NULL DEFAULT 0,
  "last_synced_at" TIMESTAMP(3),
  "last_lag_ms" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_listings_account_id_external_item_id_key"
  ON "marketplace_listings"("account_id", "external_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_listings_account_id_sku_id_key"
  ON "marketplace_listings"("account_id", "sku_id");
CREATE INDEX IF NOT EXISTS "marketplace_listings_tenant_id_account_id_idx"
  ON "marketplace_listings"("tenant_id", "account_id");
CREATE INDEX IF NOT EXISTS "marketplace_listings_tenant_id_sku_id_idx"
  ON "marketplace_listings"("tenant_id", "sku_id");
DO $$ BEGIN
  ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "marketplace_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "marketplace_orders" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "external_order_id" TEXT NOT NULL,
  "match_status" TEXT NOT NULL DEFAULT 'unmatched',
  "import_status" TEXT NOT NULL DEFAULT 'pending',
  "order_id" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "buyer_name" TEXT NOT NULL DEFAULT '',
  "buyer_phone" TEXT NOT NULL DEFAULT '',
  "shipping_address" TEXT NOT NULL DEFAULT '',
  "lines_snapshot" JSONB NOT NULL DEFAULT '[]',
  "exception_reason" TEXT,
  "raw_payload" JSONB NOT NULL DEFAULT '{}',
  "placed_at" TIMESTAMP(3),
  "imported_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_orders_account_id_external_order_id_key"
  ON "marketplace_orders"("account_id", "external_order_id");
CREATE INDEX IF NOT EXISTS "marketplace_orders_tenant_id_match_status_created_at_idx"
  ON "marketplace_orders"("tenant_id", "match_status", "created_at");
CREATE INDEX IF NOT EXISTS "marketplace_orders_tenant_id_account_id_idx"
  ON "marketplace_orders"("tenant_id", "account_id");
DO $$ BEGIN
  ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "marketplace_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "marketplace_outbox" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "job_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "op" TEXT NOT NULL DEFAULT 'upsert',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "lag_ms" INTEGER,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "marketplace_outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "marketplace_outbox_status_created_at_idx"
  ON "marketplace_outbox"("status", "created_at");
CREATE INDEX IF NOT EXISTS "marketplace_outbox_tenant_id_account_id_job_type_idx"
  ON "marketplace_outbox"("tenant_id", "account_id", "job_type");
DO $$ BEGIN
  ALTER TABLE "marketplace_outbox" ADD CONSTRAINT "marketplace_outbox_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "marketplace_outbox" ADD CONSTRAINT "marketplace_outbox_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "marketplace_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

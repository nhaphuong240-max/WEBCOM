-- W5 Hardening: API keys + Agency delivery
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT,
  "name" TEXT NOT NULL,
  "key_prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rate_limit_rpm" INTEGER NOT NULL DEFAULT 120,
  "status" TEXT NOT NULL DEFAULT 'active',
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agency_deliveries" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "agency_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "notes" TEXT NOT NULL DEFAULT '',
  "preview_token" TEXT,
  "white_label_host" TEXT,
  "annotations" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agency_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_status_idx" ON "api_keys"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");
CREATE INDEX IF NOT EXISTS "agency_deliveries_tenant_id_storefront_id_status_idx"
  ON "agency_deliveries"("tenant_id", "storefront_id", "status");

DO $$ BEGIN
  ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "agency_deliveries" ADD CONSTRAINT "agency_deliveries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "agency_deliveries" ADD CONSTRAINT "agency_deliveries_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

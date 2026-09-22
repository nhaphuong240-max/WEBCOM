-- Merchant CMS Pro SiteSettings
CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_storefront_id_key" ON "site_settings"("storefront_id");
CREATE INDEX IF NOT EXISTS "site_settings_tenant_id_idx" ON "site_settings"("tenant_id");

ALTER TABLE "site_settings"
  DROP CONSTRAINT IF EXISTS "site_settings_tenant_id_fkey";
ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "site_settings"
  DROP CONSTRAINT IF EXISTS "site_settings_storefront_id_fkey";
ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_storefront_id_fkey"
  FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

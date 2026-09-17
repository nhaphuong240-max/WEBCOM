-- A1: Storefront domain connect + TLS staging
CREATE TABLE IF NOT EXISTS "storefront_domains" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'custom',
  "dns_status" TEXT NOT NULL DEFAULT 'pending',
  "tls_status" TEXT NOT NULL DEFAULT 'pending',
  "verification_token" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "last_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storefront_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storefront_domains_hostname_key" ON "storefront_domains"("hostname");
CREATE INDEX IF NOT EXISTS "storefront_domains_tenant_id_storefront_id_idx"
  ON "storefront_domains"("tenant_id", "storefront_id");
CREATE INDEX IF NOT EXISTS "storefront_domains_storefront_id_is_primary_idx"
  ON "storefront_domains"("storefront_id", "is_primary");

DO $$ BEGIN
  ALTER TABLE "storefront_domains" ADD CONSTRAINT "storefront_domains_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "storefront_domains" ADD CONSTRAINT "storefront_domains_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

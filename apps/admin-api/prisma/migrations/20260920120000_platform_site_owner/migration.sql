-- PC2-10 PlatformSite + Page owner_type / owner_id
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "owner_type" TEXT NOT NULL DEFAULT 'storefront';
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;

UPDATE "pages" SET "owner_id" = "storefront_id" WHERE "owner_id" IS NULL OR "owner_id" = '';

ALTER TABLE "pages" ALTER COLUMN "owner_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "pages_owner_type_owner_id_slug_key"
  ON "pages"("owner_type", "owner_id", "slug");

CREATE INDEX IF NOT EXISTS "pages_owner_type_owner_id_idx"
  ON "pages"("owner_type", "owner_id");

CREATE TABLE IF NOT EXISTS "platform_sites" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "site_key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "primary_host" TEXT NOT NULL,
  "default_locale" TEXT NOT NULL DEFAULT 'vi',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "seo_defaults" JSONB NOT NULL DEFAULT '{}',
  "feature_flags" JSONB NOT NULL DEFAULT '{}',
  "interim_storefront_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_sites_site_key_key" ON "platform_sites"("site_key");
CREATE INDEX IF NOT EXISTS "platform_sites_tenant_id_status_idx" ON "platform_sites"("tenant_id", "status");

DO $$ BEGIN
  ALTER TABLE "platform_sites"
    ADD CONSTRAINT "platform_sites_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- W2 website foundation
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "primary_domain" TEXT;
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "seo_title" TEXT;
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "seo_description" TEXT;
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "gtm_container_id" TEXT;
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "meta_pixel_id" TEXT;
ALTER TABLE "storefronts" ADD COLUMN IF NOT EXISTS "published_theme_version_id" TEXT;

CREATE TABLE IF NOT EXISTS "themes" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'installed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "theme_versions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "theme_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "config" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "theme_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "template_key" TEXT NOT NULL DEFAULT 'home',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "page_versions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "page_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "content" JSONB NOT NULL DEFAULT '{}',
  "seo" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT NOT NULL DEFAULT '',
  "mime_type" TEXT NOT NULL DEFAULT 'image/jpeg',
  "width" INTEGER,
  "height" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "navigation_menus" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "items" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "storefront_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "session_id" TEXT,
  "customer_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storefront_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vouchers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'percent',
  "value" DECIMAL(18,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'website',
  "message" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN ALTER TABLE "themes" ADD CONSTRAINT "themes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "themes" ADD CONSTRAINT "themes_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "theme_versions" ADD CONSTRAINT "theme_versions_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pages" ADD CONSTRAINT "pages_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "navigation_menus" ADD CONSTRAINT "navigation_menus_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "themes_storefront_id_code_key" ON "themes"("storefront_id", "code");
CREATE INDEX IF NOT EXISTS "themes_tenant_id_idx" ON "themes"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "theme_versions_theme_id_version_key" ON "theme_versions"("theme_id", "version");
CREATE INDEX IF NOT EXISTS "theme_versions_tenant_id_idx" ON "theme_versions"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pages_storefront_id_slug_key" ON "pages"("storefront_id", "slug");
CREATE INDEX IF NOT EXISTS "pages_tenant_id_idx" ON "pages"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "page_versions_page_id_version_key" ON "page_versions"("page_id", "version");
CREATE INDEX IF NOT EXISTS "page_versions_tenant_id_idx" ON "page_versions"("tenant_id");
CREATE INDEX IF NOT EXISTS "media_assets_tenant_id_idx" ON "media_assets"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "navigation_menus_storefront_id_handle_key" ON "navigation_menus"("storefront_id", "handle");
CREATE INDEX IF NOT EXISTS "navigation_menus_tenant_id_idx" ON "navigation_menus"("tenant_id");
CREATE INDEX IF NOT EXISTS "storefront_events_tenant_id_storefront_id_name_idx" ON "storefront_events"("tenant_id", "storefront_id", "name");
CREATE INDEX IF NOT EXISTS "storefront_events_created_at_idx" ON "storefront_events"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_storefront_id_code_key" ON "vouchers"("storefront_id", "code");
CREATE INDEX IF NOT EXISTS "vouchers_tenant_id_idx" ON "vouchers"("tenant_id");
CREATE INDEX IF NOT EXISTS "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "storefronts_primary_domain_idx" ON "storefronts"("primary_domain");

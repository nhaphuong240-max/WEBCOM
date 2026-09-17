-- W3 Website Platform: Brand Kit, Marketplace, Go-live, Publish, Onboarding
ALTER TABLE "theme_versions" ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '';
ALTER TABLE "theme_versions" ADD COLUMN IF NOT EXISTS "previous_version_id" TEXT;

CREATE TABLE IF NOT EXISTS "brand_kits" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "brand_id" TEXT,
  "storefront_id" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'storefront',
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "tokens" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_catalog" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "goal" TEXT NOT NULL DEFAULT 'conversion',
  "license" TEXT NOT NULL DEFAULT 'free',
  "scores" JSONB NOT NULL DEFAULT '{}',
  "features" JSONB NOT NULL DEFAULT '[]',
  "preview_url" TEXT,
  "demo_url" TEXT,
  "theme_config" JSONB NOT NULL DEFAULT '{}',
  "page_content" JSONB NOT NULL DEFAULT '{}',
  "playbook" JSONB NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_catalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_installs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "theme_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'installed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_installs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "golive_checklist_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "group_key" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'blocking',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "waived_by" TEXT,
  "waived_reason" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "golive_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "publish_jobs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "theme_version_id" TEXT,
  "previous_theme_version_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checklist_snapshot" JSONB NOT NULL DEFAULT '{}',
  "error" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "onboarding_progress" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "current_step" TEXT NOT NULL DEFAULT 'brand_kit',
  "completed" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staging_preview_tokens" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staging_preview_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "template_catalog_code_key" ON "template_catalog"("code");
CREATE INDEX IF NOT EXISTS "template_catalog_industry_goal_idx" ON "template_catalog"("industry", "goal");
CREATE INDEX IF NOT EXISTS "brand_kits_tenant_id_scope_idx" ON "brand_kits"("tenant_id", "scope");
CREATE INDEX IF NOT EXISTS "brand_kits_storefront_id_idx" ON "brand_kits"("storefront_id");
CREATE UNIQUE INDEX IF NOT EXISTS "template_installs_storefront_id_template_id_key" ON "template_installs"("storefront_id", "template_id");
CREATE INDEX IF NOT EXISTS "template_installs_tenant_id_idx" ON "template_installs"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "golive_checklist_items_storefront_id_code_key" ON "golive_checklist_items"("storefront_id", "code");
CREATE INDEX IF NOT EXISTS "golive_checklist_items_tenant_id_storefront_id_idx" ON "golive_checklist_items"("tenant_id", "storefront_id");
CREATE INDEX IF NOT EXISTS "publish_jobs_tenant_id_storefront_id_status_idx" ON "publish_jobs"("tenant_id", "storefront_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_storefront_id_key" ON "onboarding_progress"("storefront_id");
CREATE INDEX IF NOT EXISTS "onboarding_progress_tenant_id_idx" ON "onboarding_progress"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "staging_preview_tokens_token_key" ON "staging_preview_tokens"("token");
CREATE INDEX IF NOT EXISTS "staging_preview_tokens_tenant_id_storefront_id_idx" ON "staging_preview_tokens"("tenant_id", "storefront_id");

DO $$ BEGIN
  ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "template_installs" ADD CONSTRAINT "template_installs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "template_installs" ADD CONSTRAINT "template_installs_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "template_installs" ADD CONSTRAINT "template_installs_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "template_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "golive_checklist_items" ADD CONSTRAINT "golive_checklist_items_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "golive_checklist_items" ADD CONSTRAINT "golive_checklist_items_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "staging_preview_tokens" ADD CONSTRAINT "staging_preview_tokens_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "staging_preview_tokens" ADD CONSTRAINT "staging_preview_tokens_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

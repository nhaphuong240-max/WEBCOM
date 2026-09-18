-- CMS-3 Could: page A/B flag, template reviews, creator submissions
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "experiment_code" TEXT;

CREATE TABLE IF NOT EXISTS "template_reviews" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "author_name" TEXT NOT NULL,
  "author_email" TEXT,
  "rating" INTEGER NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'published',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "template_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "template_reviews_template_id_status_idx"
  ON "template_reviews"("template_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'template_reviews_template_id_fkey'
  ) THEN
    ALTER TABLE "template_reviews"
      ADD CONSTRAINT "template_reviews_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "template_catalog"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "creator_package_submissions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "starter_home" JSONB NOT NULL DEFAULT '{}',
  "tokens" JSONB NOT NULL DEFAULT '{}',
  "issues" JSONB NOT NULL DEFAULT '[]',
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_package_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "creator_package_submissions_code_status_idx"
  ON "creator_package_submissions"("code", "status");

CREATE INDEX IF NOT EXISTS "creator_package_submissions_tenant_id_idx"
  ON "creator_package_submissions"("tenant_id");

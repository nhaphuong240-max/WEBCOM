-- P3: theme license billing (separate from merchant Order)

CREATE TABLE IF NOT EXISTS "platform_invoices" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "status" TEXT NOT NULL DEFAULT 'open',
  "qr_payload" TEXT,
  "qr_image_url" TEXT,
  "transfer_content" TEXT,
  "provider_ref" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_invoices_tenant_id_status_idx"
  ON "platform_invoices"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "platform_invoices_tenant_id_template_id_idx"
  ON "platform_invoices"("tenant_id", "template_id");
CREATE UNIQUE INDEX IF NOT EXISTS "platform_invoices_tenant_id_provider_ref_key"
  ON "platform_invoices"("tenant_id", "provider_ref");
DO $$ BEGIN
  ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "template_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "theme_licenses" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "theme_licenses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "theme_licenses_tenant_id_template_id_key"
  ON "theme_licenses"("tenant_id", "template_id");
CREATE UNIQUE INDEX IF NOT EXISTS "theme_licenses_invoice_id_key"
  ON "theme_licenses"("invoice_id");
CREATE INDEX IF NOT EXISTS "theme_licenses_tenant_id_status_idx"
  ON "theme_licenses"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "theme_licenses" ADD CONSTRAINT "theme_licenses_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "theme_licenses" ADD CONSTRAINT "theme_licenses_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "template_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "theme_licenses" ADD CONSTRAINT "theme_licenses_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "platform_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

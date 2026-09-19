-- HR-3: custom roles · employee department · POS PIN
CREATE TABLE IF NOT EXISTS "tenant_role_templates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "permissions" TEXT[] NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_role_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_role_templates_tenant_id_code_key"
  ON "tenant_role_templates"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "tenant_role_templates_tenant_id_idx"
  ON "tenant_role_templates"("tenant_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_role_templates_tenant_id_fkey') THEN
    ALTER TABLE "tenant_role_templates"
      ADD CONSTRAINT "tenant_role_templates_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pos_pin_hash" TEXT;

CREATE INDEX IF NOT EXISTS "employees_tenant_id_department_idx"
  ON "employees"("tenant_id", "department");

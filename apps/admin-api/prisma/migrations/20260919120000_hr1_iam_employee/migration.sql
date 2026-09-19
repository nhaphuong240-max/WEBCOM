-- HR-1: User invite/RBAC assignment + Employee directory
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "user_role_assignments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_code" TEXT NOT NULL,
  "scope" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_role_assignments_tenant_id_user_id_idx"
  ON "user_role_assignments"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "user_role_assignments_user_id_idx"
  ON "user_role_assignments"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_user_id_fkey') THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_role_assignments_tenant_id_fkey') THEN
    ALTER TABLE "user_role_assignments"
      ADD CONSTRAINT "user_role_assignments_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_invites" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "scope" JSONB NOT NULL DEFAULT '{}',
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "invited_by_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_invites_tenant_id_email_idx" ON "user_invites"("tenant_id", "email");
CREATE INDEX IF NOT EXISTS "user_invites_token_hash_idx" ON "user_invites"("token_hash");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_tenant_id_fkey') THEN
    ALTER TABLE "user_invites"
      ADD CONSTRAINT "user_invites_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_invites_invited_by_id_fkey') THEN
    ALTER TABLE "user_invites"
      ADD CONSTRAINT "user_invites_invited_by_id_fkey"
      FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT,
  "code" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "title" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "hired_at" TIMESTAMP(3),
  "terminated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employees_user_id_key" ON "employees"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "employees_tenant_id_code_key" ON "employees"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "employees_tenant_id_status_idx" ON "employees"("tenant_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_tenant_id_fkey') THEN
    ALTER TABLE "employees"
      ADD CONSTRAINT "employees_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_user_id_fkey') THEN
    ALTER TABLE "employees"
      ADD CONSTRAINT "employees_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "employee_store_assignments" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "employee_store_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_store_assignments_employee_id_store_id_key"
  ON "employee_store_assignments"("employee_id", "store_id");
CREATE INDEX IF NOT EXISTS "employee_store_assignments_store_id_idx"
  ON "employee_store_assignments"("store_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_store_assignments_employee_id_fkey') THEN
    ALTER TABLE "employee_store_assignments"
      ADD CONSTRAINT "employee_store_assignments_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

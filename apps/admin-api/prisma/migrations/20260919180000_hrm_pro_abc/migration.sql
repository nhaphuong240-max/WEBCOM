-- HRM-Pro waves A+B+C: org, contracts, leave, attendance, payroll

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "department_id" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "reports_to_id" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "legal_entity_id" TEXT;

CREATE INDEX IF NOT EXISTS "employees_tenant_id_department_id_idx"
  ON "employees"("tenant_id", "department_id");
CREATE INDEX IF NOT EXISTS "employees_tenant_id_reports_to_id_idx"
  ON "employees"("tenant_id", "reports_to_id");

CREATE TABLE IF NOT EXISTS "legal_entities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tax_code" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "legal_entities_tenant_id_code_key"
  ON "legal_entities"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "legal_entities_tenant_id_status_idx"
  ON "legal_entities"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "hrm_departments" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "legal_entity_id" TEXT,
  "parent_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hrm_departments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "hrm_departments_tenant_id_code_key"
  ON "hrm_departments"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "hrm_departments_tenant_id_legal_entity_id_idx"
  ON "hrm_departments"("tenant_id", "legal_entity_id");

CREATE TABLE IF NOT EXISTS "employment_contracts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "base_salary" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "document_url" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "employment_contracts_tenant_id_employee_id_status_idx"
  ON "employment_contracts"("tenant_id", "employee_id", "status");

CREATE TABLE IF NOT EXISTS "leave_policies" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "leave_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "days_per_year" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_policies_tenant_id_leave_type_key"
  ON "leave_policies"("tenant_id", "leave_type");

CREATE TABLE IF NOT EXISTS "leave_balances" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "leave_type" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "balance" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_tenant_id_employee_id_leave_type_year_key"
  ON "leave_balances"("tenant_id", "employee_id", "leave_type", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_tenant_id_employee_id_year_idx"
  ON "leave_balances"("tenant_id", "employee_id", "year");

CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "leave_type" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "days" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "reviewer_note" TEXT,
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "leave_requests_tenant_id_employee_id_status_idx"
  ON "leave_requests"("tenant_id", "employee_id", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_tenant_id_status_start_date_idx"
  ON "leave_requests"("tenant_id", "status", "start_date");

CREATE TABLE IF NOT EXISTS "work_schedules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pattern" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "work_schedules_tenant_id_code_key"
  ON "work_schedules"("tenant_id", "code");

CREATE TABLE IF NOT EXISTS "roster_entries" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "work_date" DATE NOT NULL,
  "schedule_id" TEXT,
  "planned_start" TEXT,
  "planned_end" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "roster_entries_tenant_id_employee_id_work_date_idx"
  ON "roster_entries"("tenant_id", "employee_id", "work_date");
CREATE INDEX IF NOT EXISTS "roster_entries_tenant_id_store_id_work_date_idx"
  ON "roster_entries"("tenant_id", "store_id", "work_date");

CREATE TABLE IF NOT EXISTS "attendance_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "store_id" TEXT,
  "event_type" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "attendance_events_tenant_id_employee_id_occurred_at_idx"
  ON "attendance_events"("tenant_id", "employee_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "attendance_events_tenant_id_store_id_occurred_at_idx"
  ON "attendance_events"("tenant_id", "store_id", "occurred_at");

CREATE TABLE IF NOT EXISTS "timesheet_periods" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "locked_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timesheet_periods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_periods_tenant_id_year_month_key"
  ON "timesheet_periods"("tenant_id", "year", "month");

CREATE TABLE IF NOT EXISTS "timesheet_lines" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "work_days" DECIMAL(10,2) NOT NULL,
  "work_hours" DECIMAL(10,2) NOT NULL,
  "late_minutes" INTEGER NOT NULL DEFAULT 0,
  "ot_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unpaid_leave_days" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timesheet_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_lines_period_id_employee_id_key"
  ON "timesheet_lines"("period_id", "employee_id");
CREATE INDEX IF NOT EXISTS "timesheet_lines_tenant_id_employee_id_idx"
  ON "timesheet_lines"("tenant_id", "employee_id");

CREATE TABLE IF NOT EXISTS "salary_structures" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "base_salary" DECIMAL(18,2) NOT NULL,
  "allowances" JSONB NOT NULL DEFAULT '{}',
  "effective_from" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "salary_structures_tenant_id_employee_id_effective_from_idx"
  ON "salary_structures"("tenant_id", "employee_id", "effective_from");

CREATE TABLE IF NOT EXISTS "payroll_rate_configs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "bhxh_employee" DECIMAL(8,4) NOT NULL,
  "bhxh_employer" DECIMAL(8,4) NOT NULL,
  "bhyt_employee" DECIMAL(8,4) NOT NULL,
  "bhyt_employer" DECIMAL(8,4) NOT NULL,
  "bhtn_employee" DECIMAL(8,4) NOT NULL,
  "bhtn_employer" DECIMAL(8,4) NOT NULL,
  "pit_personal_deduction" DECIMAL(18,2) NOT NULL,
  "pit_dependent_deduction" DECIMAL(18,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_rate_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_rate_configs_tenant_id_year_key"
  ON "payroll_rate_configs"("tenant_id", "year");

CREATE TABLE IF NOT EXISTS "payroll_periods" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_periods_tenant_id_year_month_key"
  ON "payroll_periods"("tenant_id", "year", "month");

CREATE TABLE IF NOT EXISTS "payroll_runs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "rates_year" INTEGER NOT NULL,
  "note" TEXT,
  "approved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "timesheet_period_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_runs_tenant_id_period_id_status_idx"
  ON "payroll_runs"("tenant_id", "period_id", "status");

CREATE TABLE IF NOT EXISTS "payslips" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "gross" DECIMAL(18,2) NOT NULL,
  "bhxh_employee" DECIMAL(18,2) NOT NULL,
  "bhyt_employee" DECIMAL(18,2) NOT NULL,
  "bhtn_employee" DECIMAL(18,2) NOT NULL,
  "pit" DECIMAL(18,2) NOT NULL,
  "net" DECIMAL(18,2) NOT NULL,
  "employer_cost" DECIMAL(18,2) NOT NULL,
  "lines" JSONB NOT NULL DEFAULT '[]',
  "disclaimer" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payslips_run_id_employee_id_key"
  ON "payslips"("run_id", "employee_id");
CREATE INDEX IF NOT EXISTS "payslips_tenant_id_employee_id_idx"
  ON "payslips"("tenant_id", "employee_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_entities_tenant_id_fkey') THEN
    ALTER TABLE "legal_entities"
      ADD CONSTRAINT "legal_entities_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hrm_departments_tenant_id_fkey') THEN
    ALTER TABLE "hrm_departments"
      ADD CONSTRAINT "hrm_departments_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hrm_departments_legal_entity_id_fkey') THEN
    ALTER TABLE "hrm_departments"
      ADD CONSTRAINT "hrm_departments_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hrm_departments_parent_id_fkey') THEN
    ALTER TABLE "hrm_departments"
      ADD CONSTRAINT "hrm_departments_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "hrm_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_department_id_fkey') THEN
    ALTER TABLE "employees"
      ADD CONSTRAINT "employees_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "hrm_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_reports_to_id_fkey') THEN
    ALTER TABLE "employees"
      ADD CONSTRAINT "employees_reports_to_id_fkey"
      FOREIGN KEY ("reports_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_legal_entity_id_fkey') THEN
    ALTER TABLE "employees"
      ADD CONSTRAINT "employees_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_contracts_tenant_id_fkey') THEN
    ALTER TABLE "employment_contracts"
      ADD CONSTRAINT "employment_contracts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employment_contracts_employee_id_fkey') THEN
    ALTER TABLE "employment_contracts"
      ADD CONSTRAINT "employment_contracts_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_policies_tenant_id_fkey') THEN
    ALTER TABLE "leave_policies"
      ADD CONSTRAINT "leave_policies_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_tenant_id_fkey') THEN
    ALTER TABLE "leave_balances"
      ADD CONSTRAINT "leave_balances_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_balances_employee_id_fkey') THEN
    ALTER TABLE "leave_balances"
      ADD CONSTRAINT "leave_balances_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_tenant_id_fkey') THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_employee_id_fkey') THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_reviewed_by_id_fkey') THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_schedules_tenant_id_fkey') THEN
    ALTER TABLE "work_schedules"
      ADD CONSTRAINT "work_schedules_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roster_entries_tenant_id_fkey') THEN
    ALTER TABLE "roster_entries"
      ADD CONSTRAINT "roster_entries_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roster_entries_employee_id_fkey') THEN
    ALTER TABLE "roster_entries"
      ADD CONSTRAINT "roster_entries_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roster_entries_schedule_id_fkey') THEN
    ALTER TABLE "roster_entries"
      ADD CONSTRAINT "roster_entries_schedule_id_fkey"
      FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_events_tenant_id_fkey') THEN
    ALTER TABLE "attendance_events"
      ADD CONSTRAINT "attendance_events_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_events_employee_id_fkey') THEN
    ALTER TABLE "attendance_events"
      ADD CONSTRAINT "attendance_events_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_periods_tenant_id_fkey') THEN
    ALTER TABLE "timesheet_periods"
      ADD CONSTRAINT "timesheet_periods_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_lines_tenant_id_fkey') THEN
    ALTER TABLE "timesheet_lines"
      ADD CONSTRAINT "timesheet_lines_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_lines_period_id_fkey') THEN
    ALTER TABLE "timesheet_lines"
      ADD CONSTRAINT "timesheet_lines_period_id_fkey"
      FOREIGN KEY ("period_id") REFERENCES "timesheet_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheet_lines_employee_id_fkey') THEN
    ALTER TABLE "timesheet_lines"
      ADD CONSTRAINT "timesheet_lines_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_tenant_id_fkey') THEN
    ALTER TABLE "salary_structures"
      ADD CONSTRAINT "salary_structures_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_employee_id_fkey') THEN
    ALTER TABLE "salary_structures"
      ADD CONSTRAINT "salary_structures_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_rate_configs_tenant_id_fkey') THEN
    ALTER TABLE "payroll_rate_configs"
      ADD CONSTRAINT "payroll_rate_configs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_periods_tenant_id_fkey') THEN
    ALTER TABLE "payroll_periods"
      ADD CONSTRAINT "payroll_periods_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_tenant_id_fkey') THEN
    ALTER TABLE "payroll_runs"
      ADD CONSTRAINT "payroll_runs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_period_id_fkey') THEN
    ALTER TABLE "payroll_runs"
      ADD CONSTRAINT "payroll_runs_period_id_fkey"
      FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_timesheet_period_id_fkey') THEN
    ALTER TABLE "payroll_runs"
      ADD CONSTRAINT "payroll_runs_timesheet_period_id_fkey"
      FOREIGN KEY ("timesheet_period_id") REFERENCES "timesheet_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_tenant_id_fkey') THEN
    ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_run_id_fkey') THEN
    ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_run_id_fkey"
      FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_employee_id_fkey') THEN
    ALTER TABLE "payslips"
      ADD CONSTRAINT "payslips_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

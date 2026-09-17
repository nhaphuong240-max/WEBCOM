-- B3: POS 1 store — location/register/shift/sale/return + location inventory

CREATE INDEX IF NOT EXISTS "skus_tenant_id_barcode_idx" ON "skus"("tenant_id", "barcode");

CREATE TABLE IF NOT EXISTS "pos_locations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pos_locations_tenant_id_code_key" ON "pos_locations"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "pos_locations_tenant_id_status_idx" ON "pos_locations"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "pos_locations" ADD CONSTRAINT "pos_locations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pos_registers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_registers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pos_registers_location_id_code_key" ON "pos_registers"("location_id", "code");
CREATE INDEX IF NOT EXISTS "pos_registers_tenant_id_location_id_idx" ON "pos_registers"("tenant_id", "location_id");
DO $$ BEGIN
  ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pos_shifts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "register_id" TEXT NOT NULL,
  "cashier_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "opening_cash" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "closing_cash" DECIMAL(18,2),
  "expected_cash" DECIMAL(18,2),
  "cash_variance" DECIMAL(18,2),
  "sales_count" INTEGER NOT NULL DEFAULT 0,
  "sales_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "returns_count" INTEGER NOT NULL DEFAULT 0,
  "returns_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tender_summary" JSONB NOT NULL DEFAULT '{}',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "note" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pos_shifts_tenant_id_status_opened_at_idx" ON "pos_shifts"("tenant_id", "status", "opened_at");
CREATE INDEX IF NOT EXISTS "pos_shifts_tenant_id_register_id_status_idx" ON "pos_shifts"("tenant_id", "register_id", "status");
DO $$ BEGIN
  ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_register_id_fkey"
    FOREIGN KEY ("register_id") REFERENCES "pos_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "location_inventories" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "sku_id" TEXT NOT NULL,
  "on_hand" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_inventories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "location_inventories_location_id_sku_id_key" ON "location_inventories"("location_id", "sku_id");
CREATE INDEX IF NOT EXISTS "location_inventories_tenant_id_sku_id_idx" ON "location_inventories"("tenant_id", "sku_id");
DO $$ BEGIN
  ALTER TABLE "location_inventories" ADD CONSTRAINT "location_inventories_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "location_inventories" ADD CONSTRAINT "location_inventories_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pos_sales" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "register_id" TEXT NOT NULL,
  "shift_id" TEXT NOT NULL,
  "receipt_no" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "subtotal_amount" DECIMAL(18,2) NOT NULL,
  "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(18,2) NOT NULL,
  "payment_summary" TEXT NOT NULL,
  "payments" JSONB NOT NULL DEFAULT '[]',
  "customer_name" TEXT NOT NULL DEFAULT '',
  "customer_phone" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "cashier_id" TEXT NOT NULL,
  "order_id" TEXT,
  "qr_payload" TEXT,
  "qr_image_url" TEXT,
  "lines_snapshot" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pos_sales_tenant_id_receipt_no_key" ON "pos_sales"("tenant_id", "receipt_no");
CREATE INDEX IF NOT EXISTS "pos_sales_tenant_id_location_id_created_at_idx" ON "pos_sales"("tenant_id", "location_id", "created_at");
CREATE INDEX IF NOT EXISTS "pos_sales_tenant_id_shift_id_idx" ON "pos_sales"("tenant_id", "shift_id");
DO $$ BEGIN
  ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_register_id_fkey"
    FOREIGN KEY ("register_id") REFERENCES "pos_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "pos_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pos_returns" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "shift_id" TEXT,
  "reason" TEXT NOT NULL DEFAULT '',
  "total_amount" DECIMAL(18,2) NOT NULL,
  "lines_snapshot" JSONB NOT NULL DEFAULT '[]',
  "refund_tender" TEXT NOT NULL DEFAULT 'cash',
  "cashier_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pos_returns_tenant_id_sale_id_idx" ON "pos_returns"("tenant_id", "sale_id");
CREATE INDEX IF NOT EXISTS "pos_returns_tenant_id_location_id_created_at_idx" ON "pos_returns"("tenant_id", "location_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

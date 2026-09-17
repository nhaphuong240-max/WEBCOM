-- AlterTable
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "updated_at_placeholder" TEXT;

-- Create tables for W1 commerce core
CREATE TABLE IF NOT EXISTS "storefronts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "storefronts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "skus" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_media" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "price_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "price_list_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "compare_at_amount" DECIMAL(18,2),
    "discount_percent" DECIMAL(5,2),
    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "order_id" TEXT,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_ledgers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "consent_marketing" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "storefront_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cart_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "storefront_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "cart_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "subtotal_amount" DECIMAL(18,2) NOT NULL,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shipping_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "shipping_name" TEXT NOT NULL,
    "shipping_phone" TEXT NOT NULL,
    "shipping_address" TEXT NOT NULL,
    "shipping_city" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "idempotency_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_body" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- FKs
DO $$ BEGIN
 ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "skus" ADD CONSTRAINT "skus_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Uniques & indexes
CREATE UNIQUE INDEX IF NOT EXISTS "storefronts_tenant_id_slug_key" ON "storefronts"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "storefronts_tenant_id_idx" ON "storefronts"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_id_slug_key" ON "products"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "products_tenant_id_brand_id_idx" ON "products"("tenant_id", "brand_id");
CREATE INDEX IF NOT EXISTS "product_variants_tenant_id_product_id_idx" ON "product_variants"("tenant_id", "product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "skus_tenant_id_code_key" ON "skus"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "skus_tenant_id_idx" ON "skus"("tenant_id");
CREATE INDEX IF NOT EXISTS "product_media_tenant_id_product_id_idx" ON "product_media"("tenant_id", "product_id");
CREATE INDEX IF NOT EXISTS "price_lists_tenant_id_brand_id_idx" ON "price_lists"("tenant_id", "brand_id");
CREATE UNIQUE INDEX IF NOT EXISTS "price_list_items_price_list_id_sku_id_key" ON "price_list_items"("price_list_id", "sku_id");
CREATE INDEX IF NOT EXISTS "price_list_items_tenant_id_sku_id_idx" ON "price_list_items"("tenant_id", "sku_id");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balances_sku_id_key" ON "inventory_balances"("sku_id");
CREATE INDEX IF NOT EXISTS "inventory_balances_tenant_id_idx" ON "inventory_balances"("tenant_id");
CREATE INDEX IF NOT EXISTS "stock_reservations_tenant_id_sku_id_status_idx" ON "stock_reservations"("tenant_id", "sku_id", "status");
CREATE INDEX IF NOT EXISTS "stock_ledgers_tenant_id_sku_id_idx" ON "stock_ledgers"("tenant_id", "sku_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");
CREATE INDEX IF NOT EXISTS "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE INDEX IF NOT EXISTS "carts_tenant_id_status_idx" ON "carts"("tenant_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "cart_lines_cart_id_sku_id_key" ON "cart_lines"("cart_id", "sku_id");
CREATE INDEX IF NOT EXISTS "cart_lines_tenant_id_idx" ON "cart_lines"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_tenant_id_idempotency_key_key" ON "orders"("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "order_lines_tenant_id_order_id_idx" ON "order_lines"("tenant_id", "order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_tenant_id_key_key" ON "idempotency_records"("tenant_id", "key");
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_entity_entity_id_idx" ON "audit_logs"("tenant_id", "entity", "entity_id");

ALTER TABLE "brands" DROP COLUMN IF EXISTS "updated_at_placeholder";

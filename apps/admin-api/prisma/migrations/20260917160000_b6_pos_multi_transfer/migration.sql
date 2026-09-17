-- B6: POS multi-store stock transfer ledger

CREATE TABLE IF NOT EXISTS "pos_stock_transfers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "from_location_id" TEXT NOT NULL,
  "to_location_id" TEXT NOT NULL,
  "sku_id" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pos_stock_transfers_tenant_id_created_at_idx"
  ON "pos_stock_transfers"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "pos_stock_transfers_tenant_id_sku_id_idx"
  ON "pos_stock_transfers"("tenant_id", "sku_id");
DO $$ BEGIN
  ALTER TABLE "pos_stock_transfers" ADD CONSTRAINT "pos_stock_transfers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_stock_transfers" ADD CONSTRAINT "pos_stock_transfers_from_location_id_fkey"
    FOREIGN KEY ("from_location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "pos_stock_transfers" ADD CONSTRAINT "pos_stock_transfers_to_location_id_fkey"
    FOREIGN KEY ("to_location_id") REFERENCES "pos_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

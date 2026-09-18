-- CMS-3 saved blocks
CREATE TABLE IF NOT EXISTS "saved_blocks" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "section_type" TEXT NOT NULL,
  "content" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "saved_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "saved_blocks_tenant_id_storefront_id_idx"
  ON "saved_blocks"("tenant_id", "storefront_id");

ALTER TABLE "saved_blocks"
  ADD CONSTRAINT "saved_blocks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "saved_blocks"
  ADD CONSTRAINT "saved_blocks_storefront_id_fkey"
  FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

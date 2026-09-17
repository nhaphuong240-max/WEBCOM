-- C4: Loyalty tiers, accounts, immutable ledger, referrals

CREATE TABLE IF NOT EXISTS "loyalty_tiers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "min_points" INTEGER NOT NULL DEFAULT 0,
  "earn_multiplier" DECIMAL(6,2) NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_tiers_tenant_id_code_key" ON "loyalty_tiers"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "loyalty_tiers_tenant_id_min_points_idx" ON "loyalty_tiers"("tenant_id", "min_points");
DO $$ BEGIN
  ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "points_balance" INTEGER NOT NULL DEFAULT 0,
  "lifetime_earned" INTEGER NOT NULL DEFAULT 0,
  "lifetime_redeemed" INTEGER NOT NULL DEFAULT 0,
  "tier_code" TEXT NOT NULL DEFAULT 'bronze',
  "referral_code" TEXT NOT NULL,
  "referred_by_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_customer_id_key"
  ON "loyalty_accounts"("customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_tenant_id_customer_id_key"
  ON "loyalty_accounts"("tenant_id", "customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_tenant_id_referral_code_key"
  ON "loyalty_accounts"("tenant_id", "referral_code");
CREATE INDEX IF NOT EXISTS "loyalty_accounts_tenant_id_tier_code_idx"
  ON "loyalty_accounts"("tenant_id", "tier_code");
DO $$ BEGIN
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_referred_by_id_fkey"
    FOREIGN KEY ("referred_by_id") REFERENCES "loyalty_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "loyalty_ledgers" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "order_id" TEXT,
  "idempotency_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_ledgers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_ledgers_tenant_id_idempotency_key_key"
  ON "loyalty_ledgers"("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "loyalty_ledgers_tenant_id_account_id_created_at_idx"
  ON "loyalty_ledgers"("tenant_id", "account_id", "created_at");
CREATE INDEX IF NOT EXISTS "loyalty_ledgers_tenant_id_order_id_idx"
  ON "loyalty_ledgers"("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "loyalty_ledgers_tenant_id_type_idx"
  ON "loyalty_ledgers"("tenant_id", "type");
DO $$ BEGIN
  ALTER TABLE "loyalty_ledgers" ADD CONSTRAINT "loyalty_ledgers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loyalty_ledgers" ADD CONSTRAINT "loyalty_ledgers_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "loyalty_referrals" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "referrer_account_id" TEXT NOT NULL,
  "referee_customer_id" TEXT NOT NULL,
  "code_used" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'rewarded',
  "fraud_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bonus_points" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_referrals_tenant_id_referee_customer_id_key"
  ON "loyalty_referrals"("tenant_id", "referee_customer_id");
CREATE INDEX IF NOT EXISTS "loyalty_referrals_tenant_id_referrer_account_id_idx"
  ON "loyalty_referrals"("tenant_id", "referrer_account_id");
CREATE INDEX IF NOT EXISTS "loyalty_referrals_tenant_id_status_idx"
  ON "loyalty_referrals"("tenant_id", "status");
DO $$ BEGIN
  ALTER TABLE "loyalty_referrals" ADD CONSTRAINT "loyalty_referrals_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "loyalty_referrals" ADD CONSTRAINT "loyalty_referrals_referrer_account_id_fkey"
    FOREIGN KEY ("referrer_account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B1: Channel binding + Unified Inbox (FR-ORG-011 · FR-SOC-001/002)

CREATE TABLE IF NOT EXISTS "channel_accounts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "storefront_id" TEXT,
  "provider" TEXT NOT NULL,
  "channel_type" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "credentials" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "connected_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "channel_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "channel_accounts_tenant_id_provider_external_id_key"
  ON "channel_accounts"("tenant_id", "provider", "external_id");
CREATE INDEX IF NOT EXISTS "channel_accounts_tenant_id_status_idx"
  ON "channel_accounts"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "channel_accounts_tenant_id_storefront_id_idx"
  ON "channel_accounts"("tenant_id", "storefront_id");

DO $$ BEGIN
  ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_storefront_id_fkey"
    FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "inbox_conversations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "channel_account_id" TEXT NOT NULL,
  "external_thread_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "contact_name" TEXT NOT NULL DEFAULT '',
  "contact_handle" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'open',
  "owner_id" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT NOT NULL DEFAULT '',
  "sla_status" TEXT NOT NULL DEFAULT 'ok',
  "sla_due_at" TIMESTAMP(3),
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_message_preview" TEXT NOT NULL DEFAULT '',
  "unread_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inbox_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inbox_conversations_channel_account_id_external_thread_id_key"
  ON "inbox_conversations"("channel_account_id", "external_thread_id");
CREATE INDEX IF NOT EXISTS "inbox_conversations_tenant_id_status_last_message_at_idx"
  ON "inbox_conversations"("tenant_id", "status", "last_message_at");
CREATE INDEX IF NOT EXISTS "inbox_conversations_tenant_id_owner_id_idx"
  ON "inbox_conversations"("tenant_id", "owner_id");
CREATE INDEX IF NOT EXISTS "inbox_conversations_tenant_id_sla_status_idx"
  ON "inbox_conversations"("tenant_id", "sla_status");

DO $$ BEGIN
  ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_channel_account_id_fkey"
    FOREIGN KEY ("channel_account_id") REFERENCES "channel_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "inbox_messages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "external_message_id" TEXT,
  "author_name" TEXT NOT NULL DEFAULT '',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inbox_messages_conversation_id_external_message_id_key"
  ON "inbox_messages"("conversation_id", "external_message_id");
CREATE INDEX IF NOT EXISTS "inbox_messages_tenant_id_conversation_id_created_at_idx"
  ON "inbox_messages"("tenant_id", "conversation_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "inbox_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- P2: merchant password for self-serve trial login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

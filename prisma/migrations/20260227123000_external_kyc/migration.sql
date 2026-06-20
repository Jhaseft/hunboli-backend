-- Add external KYC session fields to users
ALTER TABLE "users"
  ADD COLUMN "kycSessionId" TEXT,
  ADD COLUMN "kycSessionExpiresAt" TIMESTAMP(3),
  ADD COLUMN "kycSimilarity" DOUBLE PRECISION,
  ADD COLUMN "kycLivenessScore" DOUBLE PRECISION;

-- Drop legacy KYC tables
DROP TABLE IF EXISTS "kyc_documents";
DROP TABLE IF EXISTS "kyc_requests";

-- Drop legacy enums
DROP TYPE IF EXISTS "KycDocumentType";
DROP TYPE IF EXISTS "KycResourceType";

-- Add index for session lookup
CREATE UNIQUE INDEX IF NOT EXISTS "users_kycSessionId_key" ON "users"("kycSessionId");

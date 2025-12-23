-- Add OTP lockout tracking fields
ALTER TABLE "EmailOtp" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailOtp" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Add index for efficient lockout queries
CREATE INDEX "EmailOtp_lockedUntil_idx" ON "EmailOtp"("lockedUntil");


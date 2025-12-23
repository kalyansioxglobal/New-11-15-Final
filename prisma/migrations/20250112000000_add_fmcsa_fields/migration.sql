-- Add FMCSA sync fields to Carrier table
ALTER TABLE "Carrier" ADD COLUMN "fmcsaAuthorized" BOOLEAN DEFAULT true;
ALTER TABLE "Carrier" ADD COLUMN "fmcsaLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Carrier" ADD COLUMN "fmcsaSyncError" TEXT;

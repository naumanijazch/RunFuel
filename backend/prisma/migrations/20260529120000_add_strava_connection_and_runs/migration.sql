-- Bring the early Strava tables in line with the OAuth dashboard contract.
ALTER TABLE "StravaConnection" ADD COLUMN IF NOT EXISTS "id" TEXT;
UPDATE "StravaConnection"
SET "id" = 'strava_' || "userId"
WHERE "id" IS NULL;
ALTER TABLE "StravaConnection" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "StravaConnection" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StravaConnection" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StravaConnection" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "StravaConnection" DROP CONSTRAINT IF EXISTS "StravaConnection_pkey";
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "StravaConnection_userId_key" ON "StravaConnection"("userId");

ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

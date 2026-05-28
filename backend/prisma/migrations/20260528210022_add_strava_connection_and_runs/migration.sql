-- This migration was generated after the manual Strava migration had already
-- run locally. Keep it safe for fresh databases where the column is added later.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StravaConnection'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "StravaConnection" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

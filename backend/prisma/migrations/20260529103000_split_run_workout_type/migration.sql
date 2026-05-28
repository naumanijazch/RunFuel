-- Split the generic RUN schedule type into easy and quality run contexts.
BEGIN;
CREATE TYPE "WorkoutType_new" AS ENUM (
  'UPPER',
  'FULL_BODY',
  'PUSH',
  'PULL',
  'LEGS',
  'EASY_RUN',
  'QUALITY_RUN',
  'REST'
);

ALTER TABLE "GymSchedule"
  ALTER COLUMN "workoutType" TYPE "WorkoutType_new"
  USING (
    CASE "workoutType"::text
      WHEN 'RUN' THEN 'EASY_RUN'
      ELSE "workoutType"::text
    END
  )::"WorkoutType_new";

ALTER TYPE "WorkoutType" RENAME TO "WorkoutType_old";
ALTER TYPE "WorkoutType_new" RENAME TO "WorkoutType";
DROP TYPE "public"."WorkoutType_old";
COMMIT;

-- Remove the legacy LOWER workout type now that schedule options are product-defined.
BEGIN;
CREATE TYPE "WorkoutType_new" AS ENUM ('UPPER', 'FULL_BODY', 'PUSH', 'PULL', 'LEGS', 'RUN', 'REST');
ALTER TABLE "GymSchedule"
  ALTER COLUMN "workoutType" TYPE "WorkoutType_new" USING ("workoutType"::text::"WorkoutType_new");
ALTER TYPE "WorkoutType" RENAME TO "WorkoutType_old";
ALTER TYPE "WorkoutType_new" RENAME TO "WorkoutType";
DROP TYPE "public"."WorkoutType_old";
COMMIT;

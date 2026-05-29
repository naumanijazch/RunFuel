ALTER TYPE "WorkoutType" RENAME TO "WorkoutType_old";

CREATE TYPE "WorkoutType" AS ENUM (
  'UPPER',
  'FULL_BODY',
  'PUSH',
  'PULL',
  'LEGS',
  'RUN',
  'REST'
);

ALTER TABLE "GymSchedule"
  ALTER COLUMN "workoutType" TYPE "WorkoutType"
  USING (
    CASE
      WHEN "workoutType"::text IN ('EASY_RUN', 'QUALITY_RUN') THEN 'RUN'
      ELSE "workoutType"::text
    END
  )::"WorkoutType";

DROP TYPE "WorkoutType_old";

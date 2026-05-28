ALTER TYPE "GoalType" RENAME TO "GoalType_old";

CREATE TYPE "GoalType" AS ENUM (
    'FIVE_K',
    'TEN_K',
    'GENERAL_ENDURANCE',
    'HYBRID_CONDITIONING'
);

ALTER TABLE "UserSettings"
    ALTER COLUMN "goalType" DROP DEFAULT,
    ALTER COLUMN "goalType" TYPE "GoalType" USING (
        CASE "goalType"::text
            WHEN 'RACE_PREP' THEN 'FIVE_K'
            WHEN 'BUILD_BASE' THEN 'GENERAL_ENDURANCE'
            WHEN 'MAINTAIN' THEN 'HYBRID_CONDITIONING'
            WHEN 'CUT' THEN 'HYBRID_CONDITIONING'
            ELSE 'GENERAL_ENDURANCE'
        END
    )::"GoalType",
    ALTER COLUMN "goalType" SET DEFAULT 'GENERAL_ENDURANCE';

ALTER TABLE "GeneratedPlan"
    ALTER COLUMN "goalType" TYPE "GoalType" USING (
        CASE "goalType"::text
            WHEN 'RACE_PREP' THEN 'FIVE_K'
            WHEN 'BUILD_BASE' THEN 'GENERAL_ENDURANCE'
            WHEN 'MAINTAIN' THEN 'HYBRID_CONDITIONING'
            WHEN 'CUT' THEN 'HYBRID_CONDITIONING'
            ELSE 'GENERAL_ENDURANCE'
        END
    )::"GoalType";

DROP TYPE "GoalType_old";

ALTER TYPE "WorkoutType" ADD VALUE IF NOT EXISTS 'RUN';

DELETE FROM "GymSchedule" a
USING "GymSchedule" b
WHERE a."id" > b."id"
  AND a."userId" = b."userId"
  AND a."dayOfWeek" = b."dayOfWeek";

DROP INDEX IF EXISTS "GymSchedule_userId_dayOfWeek_workoutType_key";
CREATE UNIQUE INDEX "GymSchedule_userId_dayOfWeek_key" ON "GymSchedule"("userId", "dayOfWeek");

ALTER TABLE "NutritionTarget"
    ALTER COLUMN "carbsG" DROP NOT NULL,
    ALTER COLUMN "fatG" DROP NOT NULL;

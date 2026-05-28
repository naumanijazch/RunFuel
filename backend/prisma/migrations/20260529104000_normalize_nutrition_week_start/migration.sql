-- Fix nutrition targets that were saved one day early by local-date to UTC conversion.
UPDATE "NutritionTarget" target
SET "weekStartDate" = target."weekStartDate" + INTERVAL '1 day'
WHERE EXTRACT(ISODOW FROM target."weekStartDate") = 7
  AND NOT EXISTS (
    SELECT 1
    FROM "NutritionTarget" existing
    WHERE existing."userId" = target."userId"
      AND existing."weekStartDate" = target."weekStartDate" + INTERVAL '1 day'
  );

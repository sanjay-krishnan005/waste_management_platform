-- Update all existing 4-compartment bins to use the new label scheme
-- This runs as an idempotent UPDATE so it's safe to run multiple times

UPDATE bin_compartments
SET label = CASE compartment_index
  WHEN 0 THEN 'Plastic'
  WHEN 1 THEN 'General'
  WHEN 2 THEN 'Paper'
  WHEN 3 THEN 'Metal'
  ELSE label
END
WHERE bin_id IN (
  SELECT id FROM bins WHERE bin_type = 'four'
);

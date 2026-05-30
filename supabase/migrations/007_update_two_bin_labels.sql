-- Update all existing 2-compartment bins to use the new label scheme

UPDATE bin_compartments
SET label = CASE compartment_index
  WHEN 0 THEN 'Recyclable'
  WHEN 1 THEN 'Non-Recyclable'
  ELSE label
END
WHERE bin_id IN (
  SELECT id FROM bins WHERE bin_type = 'two'
);

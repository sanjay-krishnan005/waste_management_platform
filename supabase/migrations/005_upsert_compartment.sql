-- Upsert compartment data without overwriting the label
-- Labels are set once during bin creation and should be preserved

CREATE OR REPLACE FUNCTION upsert_compartment(
  p_bin_id UUID,
  p_compartment_index INT,
  p_fill_level NUMERIC,
  p_weight_kg NUMERIC,
  p_waste_count INT,
  p_classification JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO bin_compartments (bin_id, compartment_index, label, current_fill_level, current_weight_kg, waste_count, classification)
  VALUES (
    p_bin_id,
    p_compartment_index,
    'Compartment ' || (p_compartment_index + 1),
    p_fill_level,
    p_weight_kg,
    p_waste_count,
    p_classification
  )
  ON CONFLICT (bin_id, compartment_index)
  DO UPDATE SET
    current_fill_level = EXCLUDED.current_fill_level,
    current_weight_kg = EXCLUDED.current_weight_kg,
    waste_count = EXCLUDED.waste_count,
    classification = EXCLUDED.classification;
END;
$$ LANGUAGE plpgsql;

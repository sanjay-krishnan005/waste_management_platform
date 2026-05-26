-- Add 'unregistered' to the bin_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'unregistered'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bin_status')
  ) THEN
    ALTER TYPE bin_status ADD VALUE 'unregistered';
  END IF;
END $$;

-- Set existing bins that have never received telemetry to 'unregistered'
UPDATE bins SET status = 'unregistered'
WHERE status = 'active' AND last_seen_at IS NULL;

-- Clear fake health defaults on bins with no real telemetry
UPDATE bins SET
  camera_status = NULL,
  sensor_health = NULL,
  internet_status = NULL
WHERE last_seen_at IS NULL
  AND (camera_status IS NOT NULL OR sensor_health IS NOT NULL OR internet_status IS NOT NULL);
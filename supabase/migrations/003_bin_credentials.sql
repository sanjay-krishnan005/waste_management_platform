-- Bin credentials for smart bin authentication
-- Each bin can have one set of credentials (api_key + mqtt credentials)

ALTER TABLE bins ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE bins ADD COLUMN IF NOT EXISTS mqtt_username TEXT;
ALTER TABLE bins ADD COLUMN IF NOT EXISTS mqtt_password TEXT;
ALTER TABLE bins ADD COLUMN IF NOT EXISTS credentials_updated_at TIMESTAMPTZ;

-- Index for fast api_key lookup
CREATE INDEX IF NOT EXISTS idx_bins_api_key ON bins(api_key) WHERE api_key IS NOT NULL;
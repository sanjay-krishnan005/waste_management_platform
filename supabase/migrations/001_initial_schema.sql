-- Sortyx Intelligence Platform - Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'customer');
CREATE TYPE bin_type AS ENUM ('two', 'four');
CREATE TYPE bin_status AS ENUM ('active', 'maintenance', 'offline', 'decommissioned');
CREATE TYPE alert_type AS ENUM ('full_bin', 'offline', 'sensor_failure', 'camera_failure', 'low_battery', 'ad_expiry');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE report_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE report_format AS ENUM ('csv', 'pdf');

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers (business entities within org)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  fcm_token TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bins
CREATE TABLE bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  device_id TEXT UNIQUE NOT NULL,
  serial_number TEXT NOT NULL,
  qr_code TEXT,
  qr_code_url TEXT,
  bin_type bin_type NOT NULL DEFAULT 'two',
  status bin_status NOT NULL DEFAULT 'active',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  deployment_date DATE,
  last_seen_at TIMESTAMPTZ,
  latest_fill_level NUMERIC(5,2) DEFAULT 0,
  latest_battery NUMERIC(5,2),
  camera_status TEXT DEFAULT 'ok',
  sensor_health TEXT DEFAULT 'ok',
  internet_status TEXT DEFAULT 'online',
  snapshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bin compartments
CREATE TABLE bin_compartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  compartment_index INT NOT NULL CHECK (compartment_index >= 0 AND compartment_index <= 3),
  label TEXT NOT NULL,
  capacity_percent NUMERIC(5,2) DEFAULT 100,
  current_fill_level NUMERIC(5,2) DEFAULT 0,
  current_weight_kg NUMERIC(10,2) DEFAULT 0,
  waste_count INT DEFAULT 0,
  classification JSONB DEFAULT '{}',
  UNIQUE (bin_id, compartment_index)
);

-- Telemetry events
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fill_level NUMERIC(5,2),
  weight_kg NUMERIC(10,2),
  waste_count INT,
  classification JSONB,
  camera_status TEXT,
  sensor_health TEXT,
  internet_status TEXT,
  battery_percent NUMERIC(5,2),
  compartments JSONB,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_bin_recorded ON telemetry_events(bin_id, recorded_at DESC);
CREATE INDEX idx_telemetry_org_recorded ON telemetry_events(organization_id, recorded_at DESC);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  compartment_id UUID REFERENCES bin_compartments(id) ON DELETE SET NULL,
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_org_active ON alerts(organization_id, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_bin ON alerts(bin_id, created_at DESC);

-- Bin ads (digital signage)
CREATE TABLE bin_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bin_id UUID REFERENCES bins(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_org ON activity_log(organization_id, created_at DESC);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  period report_period NOT NULL,
  format report_format NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest telemetry view for fast dashboard queries
CREATE OR REPLACE VIEW bin_latest_telemetry AS
SELECT DISTINCT ON (b.id)
  b.id AS bin_id,
  b.organization_id,
  b.device_id,
  b.status,
  b.latitude,
  b.longitude,
  b.latest_fill_level,
  b.latest_battery,
  b.last_seen_at,
  b.customer_id,
  t.recorded_at AS last_telemetry_at,
  t.camera_status,
  t.sensor_health,
  t.internet_status
FROM bins b
LEFT JOIN telemetry_events t ON t.bin_id = b.id
ORDER BY b.id, t.recorded_at DESC NULLS LAST;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Removed super admin check helper function

CREATE OR REPLACE FUNCTION public.get_user_customer_id()
RETURNS UUID AS $$
  SELECT customer_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bins_updated_at BEFORE UPDATE ON bins FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin_compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY org_select ON organizations FOR SELECT USING (
  id = public.get_user_org_id()
);
CREATE POLICY org_all_admin ON organizations FOR ALL USING (
  public.get_user_role() = 'admin' AND id = public.get_user_org_id()
);

-- Customers policies
CREATE POLICY customers_select ON customers FOR SELECT USING (
  organization_id = public.get_user_org_id()
);
CREATE POLICY customers_insert ON customers FOR INSERT WITH CHECK (
  public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id()
);
CREATE POLICY customers_update ON customers FOR UPDATE USING (
  public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id()
);

-- Profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR organization_id = public.get_user_org_id()
);
CREATE POLICY profiles_update_self ON profiles FOR UPDATE USING (id = auth.uid());

-- Bins policies
CREATE POLICY bins_select ON bins FOR SELECT USING (
  (public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id())
  OR (public.get_user_role() = 'customer' AND customer_id = public.get_user_customer_id())
);
CREATE POLICY bins_insert ON bins FOR INSERT WITH CHECK (
  public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id()
);
CREATE POLICY bins_update ON bins FOR UPDATE USING (
  public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id()
);
CREATE POLICY bins_delete ON bins FOR DELETE USING (
  public.get_user_role() = 'admin' AND organization_id = public.get_user_org_id()
);

-- Compartments (inherit bin access)
CREATE POLICY compartments_select ON bin_compartments FOR SELECT USING (
  EXISTS (SELECT 1 FROM bins b WHERE b.id = bin_id AND (
    (public.get_user_role() = 'admin' AND b.organization_id = public.get_user_org_id())
    OR (public.get_user_role() = 'customer' AND b.customer_id = public.get_user_customer_id())
  ))
);
CREATE POLICY compartments_update ON bin_compartments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bins b WHERE b.id = bin_id AND (
    public.get_user_role() = 'admin'
  ))
);

-- Telemetry
CREATE POLICY telemetry_select ON telemetry_events FOR SELECT USING (
  organization_id = public.get_user_org_id()
  OR EXISTS (
    SELECT 1 FROM bins b WHERE b.id = bin_id
    AND public.get_user_role() = 'customer' AND b.customer_id = public.get_user_customer_id()
  )
);

-- Alerts
CREATE POLICY alerts_select ON alerts FOR SELECT USING (
  organization_id = public.get_user_org_id()
  OR EXISTS (
    SELECT 1 FROM bins b WHERE b.id = bin_id
    AND public.get_user_role() = 'customer' AND b.customer_id = public.get_user_customer_id()
  )
);
CREATE POLICY alerts_update ON alerts FOR UPDATE USING (
  organization_id = public.get_user_org_id()
);

-- Bin ads
CREATE POLICY bin_ads_select ON bin_ads FOR SELECT USING (
  EXISTS (SELECT 1 FROM bins b WHERE b.id = bin_id AND (
    b.organization_id = public.get_user_org_id()
    OR (public.get_user_role() = 'customer' AND b.customer_id = public.get_user_customer_id())
  ))
);
CREATE POLICY bin_ads_manage ON bin_ads FOR ALL USING (
  public.get_user_role() = 'admin'
);

-- Activity log
CREATE POLICY activity_select ON activity_log FOR SELECT USING (
  organization_id = public.get_user_org_id()
);

-- Reports
CREATE POLICY reports_select ON reports FOR SELECT USING (
  organization_id = public.get_user_org_id()
);
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (
  organization_id = public.get_user_org_id()
);

-- Service role bypass (bridge uses service role)
-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bins;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry_events;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE bin_compartments;

-- Storage bucket for snapshots and QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('bin-snapshots', 'bin-snapshots', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true) ON CONFLICT DO NOTHING;

CREATE POLICY snapshot_public_read ON storage.objects FOR SELECT USING (bucket_id IN ('bin-snapshots', 'qr-codes'));
CREATE POLICY snapshot_service_upload ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('bin-snapshots', 'qr-codes'));

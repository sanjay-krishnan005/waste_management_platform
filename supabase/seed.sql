-- Demo seed data for Sortyx Intelligence Platform
-- Run after migrations. Create auth users via Supabase dashboard or seed script.

-- Organization
INSERT INTO organizations (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Sortyx Demo', 'sortyx-demo')
ON CONFLICT DO NOTHING;

-- Customers
INSERT INTO customers (id, organization_id, name, email, phone, address) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Green City Mall', 'ops@greencitymall.com', '+975-1234567', 'Thimphu, Bhutan'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Royal University Campus', 'facilities@ru.edu.bt', '+975-7654321', 'Paro, Bhutan')
ON CONFLICT DO NOTHING;

-- Demo bins (Thimphu area coordinates)
INSERT INTO bins (id, organization_id, customer_id, device_id, serial_number, qr_code, bin_type, status, latitude, longitude, location_name, deployment_date, last_seen_at, latest_fill_level, latest_battery, camera_status, sensor_health, internet_status) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'SRTX-001', 'SN-2024-001', 'SRTX-001', 'two', 'active', 27.4728, 89.6390, 'Mall Entrance A', '2024-06-01', NOW() - INTERVAL '2 minutes', 45.5, 88, 'ok', 'ok', 'online'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'SRTX-002', 'SN-2024-002', 'SRTX-002', 'four', 'active', 27.4735, 89.6395, 'Mall Food Court', '2024-07-15', NOW() - INTERVAL '5 minutes', 82.0, 72, 'ok', 'ok', 'online'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'SRTX-003', 'SN-2024-003', 'SRTX-003', 'two', 'offline', 27.4300, 89.4200, 'Library Block', '2024-08-01', NOW() - INTERVAL '2 hours', 30.0, 15, 'offline', 'ok', 'offline'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'SRTX-004', 'SN-2024-004', 'SRTX-004', 'four', 'maintenance', 27.4310, 89.4210, 'Cafeteria', '2024-09-10', NOW() - INTERVAL '30 minutes', 55.0, 60, 'error', 'degraded', 'online'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'SRTX-005', 'SN-2024-005', 'SRTX-005', 'two', 'active', 27.4740, 89.6400, 'Parking Level B1', '2024-10-01', NOW() - INTERVAL '1 minute', 92.0, 95, 'ok', 'ok', 'online'),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', NULL, 'SRTX-006', 'SN-2024-006', 'SRTX-006', 'four', 'active', 27.4750, 89.6410, 'Warehouse Staging', '2025-01-15', NOW() - INTERVAL '10 minutes', 25.0, 80, 'ok', 'ok', 'online')
ON CONFLICT DO NOTHING;

-- Compartments for 2-bin units
INSERT INTO bin_compartments (bin_id, compartment_index, label, current_fill_level, current_weight_kg, waste_count, classification) VALUES
  ('c0000000-0000-4000-8000-000000000001', 0, 'Recyclables', 40, 8.5, 120, '{"plastic": 50, "paper": 40, "metal": 30}'),
  ('c0000000-0000-4000-8000-000000000001', 1, 'General Waste', 51, 10.2, 85, '{"organic": 45, "other": 40}'),
  ('c0000000-0000-4000-8000-000000000003', 0, 'Recyclables', 25, 4.0, 60, '{"plastic": 30, "paper": 30}'),
  ('c0000000-0000-4000-8000-000000000003', 1, 'General Waste', 35, 5.5, 40, '{"organic": 25, "other": 15}'),
  ('c0000000-0000-4000-8000-000000000005', 0, 'Recyclables', 95, 18.0, 200, '{"plastic": 80, "paper": 70}'),
  ('c0000000-0000-4000-8000-000000000005', 1, 'General Waste', 89, 15.0, 150, '{"organic": 90, "other": 60}')
ON CONFLICT DO NOTHING;

-- Compartments for 4-bin units
INSERT INTO bin_compartments (bin_id, compartment_index, label, current_fill_level, current_weight_kg, waste_count, classification) VALUES
  ('c0000000-0000-4000-8000-000000000002', 0, 'Plastic', 75, 6.0, 80, '{"plastic": 80}'),
  ('c0000000-0000-4000-8000-000000000002', 1, 'Paper', 85, 7.5, 95, '{"paper": 95}'),
  ('c0000000-0000-4000-8000-000000000002', 2, 'Metal/Glass', 70, 5.0, 45, '{"metal": 25, "glass": 20}'),
  ('c0000000-0000-4000-8000-000000000002', 3, 'Organic', 98, 12.0, 110, '{"organic": 110}'),
  ('c0000000-0000-4000-8000-000000000004', 0, 'Plastic', 50, 4.0, 40, '{"plastic": 40}'),
  ('c0000000-0000-4000-8000-000000000004', 1, 'Paper', 55, 4.5, 50, '{"paper": 50}'),
  ('c0000000-0000-4000-8000-000000000004', 2, 'Metal/Glass', 60, 5.0, 35, '{"metal": 20, "glass": 15}'),
  ('c0000000-0000-4000-8000-000000000004', 3, 'Organic', 55, 6.0, 55, '{"organic": 55}'),
  ('c0000000-0000-4000-8000-000000000006', 0, 'Plastic', 20, 2.0, 15, '{"plastic": 15}'),
  ('c0000000-0000-4000-8000-000000000006', 1, 'Paper', 30, 3.0, 25, '{"paper": 25}'),
  ('c0000000-0000-4000-8000-000000000006', 2, 'Metal/Glass', 25, 2.5, 10, '{"metal": 6, "glass": 4}'),
  ('c0000000-0000-4000-8000-000000000006', 3, 'Organic', 25, 3.0, 20, '{"organic": 20}')
ON CONFLICT DO NOTHING;

-- Sample alerts
INSERT INTO alerts (organization_id, bin_id, alert_type, severity, message, created_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000005', 'full_bin', 'high', 'Bin SRTX-005 compartment General Waste is 89% full', NOW() - INTERVAL '1 hour'),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003', 'offline', 'critical', 'Bin SRTX-003 has been offline for over 1 hour', NOW() - INTERVAL '2 hours'),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'camera_failure', 'medium', 'Camera on SRTX-004 reporting errors', NOW() - INTERVAL '45 minutes'),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003', 'low_battery', 'high', 'Battery on SRTX-003 at 15%', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- Expiring ad
INSERT INTO bin_ads (bin_id, title, expires_at, is_active) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Summer Sale Promo', NOW() + INTERVAL '2 days', true),
  ('c0000000-0000-4000-8000-000000000002', 'Expired Campaign', NOW() - INTERVAL '1 day', true)
ON CONFLICT DO NOTHING;

-- Activity log samples
INSERT INTO activity_log (organization_id, bin_id, action, details) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'telemetry_received', '{"fill": 45.5}'),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000005', 'alert_created', '{"type": "full_bin"}'),
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'telemetry_received', '{"fill": 82}'),
  ('a0000000-0000-4000-8000-000000000001', NULL, 'bin_deployed', '{"device_id": "SRTX-006"}')
ON CONFLICT DO NOTHING;

-- Generate 7 days of telemetry for SRTX-001 (for charts)
DO $$
DECLARE
  i INT;
  ts TIMESTAMPTZ;
  fill_val NUMERIC;
BEGIN
  FOR i IN 0..168 LOOP
    ts := NOW() - (i || ' hours')::INTERVAL;
    fill_val := 30 + (sin(i::float / 12) * 20 + random() * 10);
    INSERT INTO telemetry_events (bin_id, organization_id, recorded_at, fill_level, weight_kg, waste_count, camera_status, sensor_health, internet_status, battery_percent, compartments)
    VALUES (
      'c0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      ts,
      fill_val,
      fill_val * 0.2,
      floor(random() * 10 + 5)::int,
      'ok', 'ok', 'online',
      85 + random() * 10,
      jsonb_build_array(
        jsonb_build_object('index', 0, 'fillLevel', round((fill_val * 0.9)::numeric, 2)),
        jsonb_build_object('index', 1, 'fillLevel', round(fill_val::numeric, 2))
      )
    );
  END LOOP;
END $$;

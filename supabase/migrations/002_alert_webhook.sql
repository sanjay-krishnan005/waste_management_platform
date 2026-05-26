-- Database webhook: configure in Supabase Dashboard
-- Table: alerts, Event: INSERT, URL: https://<project>.supabase.co/functions/v1/send-alert-push
-- Or use pg_net if enabled. This migration documents the trigger approach via NOTIFY.

CREATE OR REPLACE FUNCTION notify_new_alert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_alert', json_build_object(
    'id', NEW.id,
    'bin_id', NEW.bin_id,
    'alert_type', NEW.alert_type,
    'message', NEW.message,
    'organization_id', NEW.organization_id
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_alert_created
  AFTER INSERT ON alerts
  FOR EACH ROW EXECUTE FUNCTION notify_new_alert();

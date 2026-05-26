# Deployment Guide

## Prerequisites

- Node.js 18+
- Supabase project
- Existing MQTT broker (Mosquitto, EMQX, HiveMQ, etc.)
- Firebase project with FCM enabled (optional, for push)
- Vercel or similar for Next.js (optional)

## 1. Supabase setup

```bash
cd sortyx-intelligence-platform
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Optional: Load demo seed data

By default, **seeding is disabled** to start with a clean database. You can optionally load demo data:

```bash
psql $DATABASE_URL -f supabase/seed.sql
```

This populates:
- **Organizations:** Sortyx Demo (for testing)
- **Customers:** Green City Mall, Royal University Campus
- **Bins:** 6 test bins with sample telemetry (active, offline, maintenance status)
- **Sample alerts and activity logs:** For dashboard testing

To re-enable auto-seeding during local development, edit `supabase/config.toml`:
```toml
[db.seed]
enabled = true  # ← Enable to auto-seed on `supabase db reset`
sql_paths = ["./seed.sql"]
```

### Create demo users (Supabase Dashboard → Authentication)

| Email | Role (set in user metadata `role`) |
|-------|-------------------------------------|
| admin@sortyx.demo | admin |
| customer@sortyx.demo | customer |

After signup, update profiles:

```sql
UPDATE profiles SET
  organization_id = 'a0000000-0000-4000-8000-000000000001',
  role = 'admin'
WHERE email = 'admin@sortyx.demo';

UPDATE profiles SET
  organization_id = 'a0000000-0000-4000-8000-000000000001',
  customer_id = 'b0000000-0000-4000-8000-000000000001',
  role = 'customer'
WHERE email = 'customer@sortyx.demo';
```

### Realtime

Ensure `bins`, `telemetry_events`, `alerts`, `activity_log`, `bin_compartments` are in the `supabase_realtime` publication (included in migration).

### Alert push webhook

Deploy edge function:

```bash
npx supabase functions deploy send-alert-push
supabase secrets set FIREBASE_SERVER_KEY=your_fcm_server_key
```

In Dashboard → Database → Webhooks: on `alerts` INSERT → call `send-alert-push`.

## 2. Web app

```bash
cp apps/web/.env.example apps/web/.env.local
# Fill Supabase + Firebase keys
npm install
npm run dev --workspace=@sortyx/web
```

Deploy to Vercel: set root to `apps/web`, same env vars.

## 3. MQTT bridge

```bash
cp services/mqtt-bridge/.env.example services/mqtt-bridge/.env
# MQTT_URL, credentials, Supabase service role
npm run dev:bridge
```

Production: deploy Docker image on VPS/Railway/Fly with network access to your broker.

```bash
docker build -f services/mqtt-bridge/Dockerfile -t sortyx-mqtt-bridge .
docker run --env-file services/mqtt-bridge/.env -p 8080:8080 sortyx-mqtt-bridge
```

Health check: `GET http://localhost:8080/health`

## 4. MQTT broker ACL (recommended)

Create a dedicated bridge user:

- **Subscribe**: `sortyx/bins/+/telemetry`, `sortyx/bins/+/snapshot`
- **Publish**: none

Pi devices:

- **Publish**: `sortyx/bins/{their-device-id}/#`
- **Subscribe**: none (or config topics only)

## Environment checklist

| Variable | Component |
|----------|-----------|
| NEXT_PUBLIC_SUPABASE_URL | web |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | web |
| SUPABASE_SERVICE_ROLE_KEY | web (API routes), bridge |
| MQTT_URL, MQTT_USER, MQTT_PASS | bridge |
| NEXT_PUBLIC_FIREBASE_* | web (FCM client) |
| FIREBASE_SERVER_KEY | edge function |

# Sortyx Intelligence Platform

Production-ready SaaS for monitoring Raspberry Pi smart waste bins in real time.

## Stack

- **Next.js 14** — App Router, TypeScript, Tailwind, shadcn-style UI
- **Supabase** — Auth, PostgreSQL, Realtime, Storage
- **MQTT bridge** — Node.js service connecting to your existing broker
- **Leaflet** — Live bin maps
- **Recharts** — Historical telemetry charts
- **Firebase FCM** — Push notifications for alerts

## Monorepo structure

```
apps/web              → Dashboard, portal, admin UI
packages/shared       → Zod schemas, MQTT types
services/mqtt-bridge  → Telemetry ingestion service
supabase/             → Migrations, seed, edge functions
docs/                 → MQTT contract, deployment guide
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a [Supabase](https://supabase.com) project
2. Run migrations: `npx supabase db push` (or apply `supabase/migrations/*.sql` in SQL editor)
3. Run `supabase/seed.sql` for demo bins and telemetry
4. Copy `apps/web/.env.example` → `apps/web/.env.local` and fill keys

### 3. Create demo users

Sign up four users in Supabase Auth, then run the profile updates in [docs/deployment.md](docs/deployment.md).

Demo password suggestion (dev only): `SortyxDemo123!`

### 4. Start web app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Start MQTT bridge

```bash
cp services/mqtt-bridge/.env.example services/mqtt-bridge/.env
npm run dev:bridge
```

Publish test telemetry — see [docs/mqtt-contract.md](docs/mqtt-contract.md).

## Features

| Area | Description |
|------|-------------|
| **Roles** | Admin, Customer |
| **Bins** | 2-bin and 4-bin, QR codes, GPS, customer assignment |
| **Dashboard** | KPIs, live map, realtime updates, alert center |
| **Bin details** | Live metrics, charts, compartments, health, snapshots |
| **Customer portal** | RLS-scoped view of assigned bins only |
| **Reports** | Daily / weekly / monthly CSV and PDF export |
| **Alerts** | Full bin, offline, sensor/camera failure, low battery, ad expiry |

## Documentation

- [MQTT contract](docs/mqtt-contract.md) — Topics and JSON schema for Pi firmware team
- [Deployment](docs/deployment.md) — Production setup checklist

## License

Proprietary — Sortyx

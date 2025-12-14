```json
  {
    "title": "Prerequisites & Local Setup Guide",
    "docType": "PREREQUISITES",
    "purpose": "Complete requirements list and step-by-step local installation for app + database + observability stack.",
    "audience": ["developers", "new contributors"],
    "relatedFiles": [".env.example", "package.json", "prisma/schema.prisma", "config/database.js"],
    "lastUpdated": "2025-12-14"
  }
```
# Prerequisites and Installation Guide

This repo is a Node.js (ESM) Express app with Prisma/Postgres plus OpenTelemetry tracing and Prometheus metrics.

## Required software

### Node.js
- Node.js 18+ recommended.
- npm comes with Node.

Verify:
```bash
node --version
npm --version
```

### PostgreSQL
- PostgreSQL 14+ recommended (or use Docker).
- A database named `tracing_db` is used in the provided `.env.example`.

Verify:
```bash
psql --version
```

### Prisma
Prisma CLI is installed via `devDependencies`, so after `npm install` it should be available as:
```bash
npx prisma --version
```

## Optional observability stack

### Tempo (or any OTLP collector/endpoint)
This app exports traces using OTLP:
- gRPC: typically on port `4317`
- HTTP: typically on port `4318` (path often includes `/v1/traces`)

Your `.env` controls:
- `OTLP_TRACE_PROTOCOL` (`grpc` or `http`)
- `OTLP_TRACE_DEST_URL` (host/port or full URL depending on protocol)

### Prometheus
Prometheus scrapes metrics endpoints exposed by this app:
- OpenTelemetry exporter: `http://localhost:9464/metrics` (port controlled by `METRICS_PORT`)
- Custom prom-client: either `http://localhost:9465/metrics-custom` (if `METRICS_CUSTOM_PORT` is set) or `http://localhost:3000/metrics-custom` (fallback when `METRICS_CUSTOM_PORT` is unset)

## Install and run (local)

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
```bash
cp .env.example .env
```

Minimum set to run locally:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (default 3000)
- `METRICS_PORT` (default 9464)
- `METRICS_CUSTOM_PORT` (optional; example uses 9465)
- `CUSTOM_METRICS_PATH` (default `/metrics-custom`)

Notes on DB auth:
- Prefer a real local password or Docker Postgres credentials.
- Avoid using “trust” authentication in Postgres except in isolated dev environments where you accept the risk.

### 3) Prepare the database (Prisma)
```bash
npm run prisma:generate
npm run prisma:migrate
# optional
npm run prisma:seed
```

### 4) Start the app
```bash
npm start
```

## What should be listening (ports)

### Main app (Express): `PORT` (default 3000)
- Health: `GET /health`
- API routes: `/api/auth/*`, `/api/users/*`, `/api/chaos/*`

### OpenTelemetry Prometheus exporter: `METRICS_PORT` (default 9464)
- Metrics: `GET /metrics`

### Custom metrics (prom-client): `METRICS_CUSTOM_PORT` (optional, example 9465)
- Metrics: `GET {CUSTOM_METRICS_PATH}` (default `/metrics-custom`)
- If `METRICS_CUSTOM_PORT` is NOT set, then `/metrics-custom` is served by Express on the main app port (3000).

## Quick verification commands

### Health
```bash
curl http://localhost:3000/health
```

### OpenTelemetry metrics (9464)
```bash
curl http://localhost:9464/metrics
```

### Custom metrics (9465 or 3000 fallback)
If `METRICS_CUSTOM_PORT=9465`:
```bash
curl http://localhost:9465/metrics-custom
```

If `METRICS_CUSTOM_PORT` is unset:
```bash
curl http://localhost:3000/metrics-custom
```

## Prometheus scrape config example

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "node-app-otel"
    static_configs:
      - targets: ["localhost:9464"]

  - job_name: "node-app-custom"
    static_configs:
      - targets: ["localhost:9465"]
    metrics_path: "/metrics-custom"
```

If you use the fallback (custom metrics on 3000), change the second target to `localhost:3000`.

## Troubleshooting

### “/metrics-custom returns 404”
- If `METRICS_CUSTOM_PORT` is set, the custom metrics server is on that port (example 9465), and the Express route on 3000 is intentionally not mounted.

### “Tracing works but no logs exported”
- Winston logs always go to console + file.
- OpenTelemetry LogRecords are written to `OTEL_LOG_FILE_PATH` (default `./logs/otel.jsonl`) when the logs pipeline is enabled.
- Network export for OTel logs is disabled via `OTEL_LOGS_EXPORTER=none` in the example env.

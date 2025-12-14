```json
{
  "title": "Tracing Application (Express + Prisma + OpenTelemetry)",
  "docType": "README",
  "purpose": "How to run the service locally, understand ports/endpoints, and verify tracing/metrics/logging.",
  "audience": ["developers", "SRE", "observability learners"],
  "entrypoints": ["server.js", "app.js"],
  "relatedDocs": ["PREREQUISITES.md", "BASIC_TESTS.md", "README_REQ_FLOW.md"],
  "lastUpdated": "2025-12-14"
}
```

# Tracing Application with OpenTelemetry & Tempo

A Node.js (ESM) Express service instrumented for tracing (OTLP to Tempo), metrics (Prometheus), and logs (Winston + optional OpenTelemetry LogRecords), with PostgreSQL persistence via Prisma.

## How the service boots (important)

`npm start` runs `node server.js`.

`server.js` loads observability *before* the Express app:
1. Tracing is initialized first (`config/tracing.js`) so auto-instrumentation can hook modules early.
2. OpenTelemetry Logs pipeline is initialized (`config/otel-logs.js`) to write LogRecords to a local JSONL file (no network export).
3. Then `app.js` is imported and the HTTP server starts.

## Ports and endpoints (the 3-port setup)

This app can expose **three different ports** depending on environment variables:

### 1) App port: `PORT` (default `3000`)
This is the main HTTP API server created by Express.

- Health:
  - `GET /health`
- API routes:
  - Auth:
    - `POST /api/auth/login`
  - Users:
    - `GET /api/users`
    - `GET /api/users/:id`
    - `POST /api/users`
    - `PUT /api/users/:id`
    - `DELETE /api/users/:id`
  - Chaos (testing endpoints):
    - `POST /api/chaos/latency`
    - `POST /api/chaos/random-failure`
    - `POST /api/chaos/memory-leak`
    - `POST /api/chaos/cpu-spike`
    - `POST /api/chaos/database-error`
    - `POST /api/chaos/disable-all`
    - `GET /api/chaos/status`
    - `POST /api/chaos/circuit-breaker-test`

### 2) OpenTelemetry Prometheus exporter port: `METRICS_PORT` (default `9464`)
This port is opened by the OpenTelemetry Prometheus exporter created in `config/metrics.js`.

- Endpoint:
  - `GET http://localhost:9464/metrics` (path is always `/metrics` for this exporter)

Notes:
- These metrics come from the OpenTelemetry SDK MeterProvider and do **not** include exemplars in the current implementation.
- This endpoint is intended for Prometheus scraping.

### 3) Custom prom-client metrics port: `METRICS_CUSTOM_PORT` (optional; example `9465`)
This is where confusion often happens, because `/metrics-custom` can appear on **either** port 3000 **or** 9465 depending on env.

The app’s custom metrics are built using `prom-client` and are served in one of two ways:

#### Option A (recommended): dedicate a separate port (e.g., `9465`)
If `METRICS_CUSTOM_PORT` is set to a valid port (example in `.env.example` is `9465`), `config/metrics.js` starts a **separate HTTP server** that serves custom metrics on:

- `GET http://localhost:9465/metrics-custom` (path is controlled by `CUSTOM_METRICS_PATH`)

This avoids mixing metrics traffic with your main API and prevents duplicate endpoints.

#### Option B (fallback): serve custom metrics on the main app port (3000)
If `METRICS_CUSTOM_PORT` is **not set**, then `app.js` mounts a route (default path `/metrics-custom`) on the main Express app:

- `GET http://localhost:3000/metrics-custom`

#### Summary table
| What | Default port | Who serves it | URL |
|---|---:|---|---|
| Main API + `/health` | 3000 | Express (`app.js`) | `http://localhost:3000/health` |
| OTel Prometheus exporter metrics | 9464 | OTel exporter (`config/metrics.js`) | `http://localhost:9464/metrics` |
| Custom prom-client metrics | 9465 (if enabled) | Separate HTTP server (`config/metrics.js`) | `http://localhost:9465/metrics-custom` |
| Custom prom-client metrics fallback | 3000 (if no 9465) | Express (`app.js`) | `http://localhost:3000/metrics-custom` |

## Tracing export (Tempo / OTLP)

Tracing export is configured by:
- `OTLP_TRACE_PROTOCOL` = `http` or `grpc`
- `OTLP_TRACE_DEST_URL` = destination

Defaults in code:
- protocol: `http`
- url: `http://localhost:4318/v1/traces`

Example `.env.example` switches to gRPC:
- `OTLP_TRACE_PROTOCOL=grpc`
- `OTLP_TRACE_DEST_URL=localhost:4317`

## Logging

Two logging outputs exist:
1. Winston application logs (console + file). Winston injects trace/span IDs when a span is active.
2. OpenTelemetry LogRecords written to `OTEL_LOG_FILE_PATH` (default `./logs/otel.jsonl`) by `config/otel-logs.js`.

## Quick start (local)
### 1) Install
`npm install`

### 2) Configure `.env`
`cp .env.example .env`

At minimum, check:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `METRICS_PORT`
- `METRICS_CUSTOM_PORT` (optional but recommended)

### 3) Setup database (Prisma)
`npm run prisma:generate`
`npm run prisma:migrate`

optional
`npm run prisma:seed`

### 4) Run
`npm start`

## Verification checklist (curl)

Health:
`curl http://localhost:3000/health`


API:
`curl http://localhost:3000/api/users`

OTel exporter metrics:
`curl http://localhost:9464/metrics`

Custom metrics:
- If `METRICS_CUSTOM_PORT=9465`:
`curl http://localhost:9465/metrics-custom`

- If `METRICS_CUSTOM_PORT` is unset:
`curl http://localhost:3000/metrics-custom`

## Docs in this repo
- `PREREQUISITES.md`: detailed prerequisites + local stack setup
- `BASIC_TESTS.md`: test scenarios for CRUD/auth/chaos
- `README_REQ_FLOW.md`: request flow and where tracing/metrics/logging hook in (this file should be plain text Markdown; if it’s binary in your repo, replace it)

## License
MIT

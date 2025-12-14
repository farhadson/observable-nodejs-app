```json
{
  "title": "📋 Request Flow Documentation (Diagram)",
  "docType": "README_REQ_FLOW",
  "purpose": "Diagram-first explanation of boot order, request lifecycle, and observability correlation (traces/logs/metrics) including ports 3000/9464/9465.",
  "audience": ["developers", "SRE", "observability learners"],
  "entrypoints": ["server.js", "app.js"],
  "relatedFiles": ["server.js", "app.js", "config/metrics.js", "config/tracing.js", "config/logging.js", "middleware/traceContext.js", "middleware/errorHandler.js"],
  "lastUpdated": "2025-12-14"
}
```

# 📋 REQUEST FLOW DOCUMENTATION (Diagram)

This file is intended to replace `README_REQ_FLOW.md` if your current repo has it stored as a binary/non-text artifact.
All diagrams below reflect the current wiring in `server.js`, `app.js`, and the observability modules. 

---

## Boot order (process start)

```mermaid
flowchart TD
  A["Process starts: node server.js"] --> B["Import ./config/tracing.js FIRST"]
  B --> C["Import ./config/otel-logs.js and initOtelLogs()"]
  C --> D["Import ./app.js (Express app)"]
  D --> E["Import ./config/logging.js (Winston logger)"]
  E --> F["dotenv.config()"]
  F --> G["app.listen(PORT)"]
  G --> H["Log URLs: /health, /metrics, /metrics-custom"]
```

- Tracing is imported before the Express app so auto-instrumentation can hook modules early.   
- OpenTelemetry logs are initialized to write LogRecords to a local JSONL file (no network export in this design).   
- The server logs the final URLs for health and metrics, and it chooses the custom-metrics URL based on whether `METRICS_CUSTOM_PORT` is set. 

---

## Ports & “who serves what”

```mermaid
flowchart LR
  subgraph P3000["PORT=3000 (Express)"]
    H["GET /health"]
    API["/api/auth, /api/users, /api/chaos/"]
    MC3000["GET /metrics-custom (ONLY if METRICS_CUSTOM_PORT is NOT set)"]
  end

  subgraph P9464["METRICS_PORT=9464 (OTel Prometheus Exporter)"]
    M1["GET /metrics"]
  end

  subgraph P9465["METRICS_CUSTOM_PORT=9465 (Custom HTTP server)"]
    MC9465["GET CUSTOM_METRICS_PATH (/metrics-custom by default)"]
  end
```

- `METRICS_PORT` (default 9464) is opened by the OpenTelemetry Prometheus exporter in `config/metrics.js` and serves `/metrics`.   
- `METRICS_CUSTOM_PORT` (example 9465) is opened by a separate Node HTTP server in `config/metrics.js` and serves `CUSTOM_METRICS_PATH` (default `/metrics-custom`).   
- If `METRICS_CUSTOM_PORT` is set, `app.js` intentionally does **not** mount `/metrics-custom` on port 3000 to avoid duplicate exposure. 

---

## Request lifecycle (sequence diagram)

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant Express as Express (app.js)
  participant TraceMW as traceContextMiddleware
  participant MetricsMW as metrics wrapper (res.end)
  participant Router as Routes (/api/*)
  participant Controller
  participant Service
  participant Prisma as Prisma (config/database.js)
  participant ErrMW as errorHandler
  participant OTel as OTel SDK (tracing/logs/metrics)
  participant PromCustom as Custom metrics registry (prom-client)

  Client->>Express: HTTP request (e.g., POST /api/users)
  Express->>TraceMW: Run middleware
  TraceMW->>OTel: Read active span context
  TraceMW-->>Client: Set X-Trace-Id response header (later in response)
  Express->>MetricsMW: Start timer + wrap res.end()

  Express->>Router: Dispatch to route
  Router->>Controller: Call controller handler
  Controller->>Service: Business logic
  Service->>Prisma: DB query (Prisma client)
  Prisma-->>Service: Result
  Service-->>Controller: Result / throw error
  Controller-->>Express: res.json(...) OR next(err)

  alt Success
    Express->>MetricsMW: res.end called
    MetricsMW->>OTel: recordHttpRequest (OTel instruments)
    MetricsMW->>PromCustom: recordHttpRequest (custom histogram/counter, maybe exemplar)
    Express-->>Client: Response body
  else Error
    Express->>ErrMW: errorHandler(err)
    ErrMW->>OTel: span.recordException + setStatus(ERROR)
    ErrMW->>PromCustom: recordError(errorType, route)
    ErrMW-->>Client: JSON error response
    Express->>MetricsMW: res.end called
    MetricsMW->>OTel: recordHttpRequest (status_code reflects error)
    MetricsMW->>PromCustom: recordHttpRequest (status_code reflects error)
  end
```

- `traceContextMiddleware` injects trace identifiers into the request object and sets `X-Trace-Id` on the response so clients can correlate requests with traces/logs.   
- The metrics middleware wraps `res.end()` so it can measure the total request duration and record metrics using the final `statusCode` and a best-effort “route” value.   
- The global error handler records the exception on the active span and increments the custom error counter metric, then returns a structured JSON error response. 

---

## Metrics correlation (exemplars)

```mermaid
flowchart TD
  A[Active span exists?] -->|No| B[Record custom metrics without exemplar]
  A -->|Yes| C[Extract traceId + spanId from active context]
  C --> D[Attach exemplarLabels to prom-client histogram/counter]
  D --> E[Prometheus scrape -> exemplar contains trace correlation]
```

- Custom prom-client metrics attempt to attach exemplar labels (`traceId`/`spanId`) when a span is active, enabling “click from metric to trace” workflows in Grafana/Tempo setups.   
- OpenTelemetry’s `/metrics` endpoint (9464) is produced by the OTel Prometheus exporter and does not provide the same exemplar behavior in this implementation. 

---

## Chaos endpoints (where they fit)

```mermaid
flowchart TD
  A[Client calls /api/chaos/*] --> B[Chaos routes]
  B --> C[Chaos controller]
  C --> D[Chaos service]
  D --> E[Inject latency / random failures / CPU spike / memory leak / DB error]
  E --> F[Normal error flow + metrics + trace correlation still applies]
```

- Chaos routes are mounted under `/api/chaos` and drive behavior via controller → service calls, while still flowing through the same middleware stack (trace context, metrics wrapper, error handler). 
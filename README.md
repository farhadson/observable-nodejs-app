# Tracing Application with OpenTelemetry & Tempo

A production-ready Node.js application with distributed tracing, metrics, and logging.

---

## Features

- ✅ **OpenTelemetry tracing** to Tempo with automatic instrumentation
- ✅ **Winston logging** with trace ID injection in every log
- ✅ **Prometheus metrics** with exemplars linking to traces
- ✅ **MVC architecture** with Express framework
- ✅ **PostgreSQL database** with Prisma ORM
- ✅ **JSON validation** using Joi library
- ✅ **Complete CRUD operations** ready to test
- ✅ **Chaos engineering** endpoints for testing
- ✅ **ES6+ features** annotated for learning

---

## Quick Setup

### 1. Install Dependencies

```
npm install
```

### 2. Configure Environment

```
cp .env.example .env 
# Edit .env with your configuration

or Create a `.env` file based on `.env.example`


Required variables:
DATABASE_URL="postgresql://user:password@localhost:5432/tracing_db"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="1h"
SERVICE_NAME="tracing-app"
SERVICE_VERSION="1.0.0"
OTLP_TRACE_DEST_URL="http://localhost:4318/v1/traces"
OTLP_TRACE_PROTOCOL="http"
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/app.log"
PORT=3000
METRICS_PORT=9464
```

### 3. Setup Database

```
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Seed database
npm run prisma:seed
```

### 4. Start Application

```
npm start
```

---

## CRUD Operations with curl

### Create User

```
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123","name":"John Doe"}'
```

### Login

```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Get All Users

```
curl http://localhost:3000/api/users
```

### Get User by ID

```
curl http://localhost:3000/api/users/1
```

### Update User

```
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Updated"}'
```

### Delete User

```
curl -X DELETE http://localhost:3000/api/users/1
```

### Health Check

```
curl http://localhost:3000/health
```

---

## Observability Endpoints

| Endpoint | Purpose | Exemplars | Port |
|----------|---------|-----------|------|
| `http://localhost:9464/metrics` | OpenTelemetry auto-instrumented metrics | ❌ No | 9464 |
| `http://localhost:3000/metrics-custom` | Custom metrics with trace exemplars | ✅ Yes | 3000 |
| `http://localhost:3000/health` | Health check endpoint | N/A | 3000 |

**Traces**: Automatically sent to Tempo at configured endpoint (see `.env`)

### Why Two Metrics Endpoints?

We maintain two metrics endpoints because:
1. **Port 9464** provides comprehensive auto-instrumented metrics from OpenTelemetry
2. **Port 3000** provides custom metrics with **exemplars** - allowing you to click from a metric spike in Grafana directly to the trace in Tempo

### Prometheus Configuration

Both should be scraped by Prometheus for complete observability.

## Exemplars

**What are exemplars?**
Exemplars link individual metric data points to their corresponding traces. When you see a latency spike in Grafana, you can click the exemplar to jump directly to the trace that caused it in Tempo.

### 🎯 Key Takeaways on defining exemplars
1. Only Histograms and Counters support exemplars (not Gauges)
2. Strategic placement matters - add exemplars where you need debugging (HTTP, DB, errors)
3. prom-client only - OpenTelemetry metrics can't have exemplars in current version
4. We only had 2 because that's a minimal viable implementation
5. You should add more - especially error counter and HTTP request counter
6. Would you like me to provide the complete updated files with all exemplar-enabled metrics?

### 📊 Summary: Which Metrics Have Exemplars


The `/metrics-custom` endpoint provides these metrics with exemplar support (trace links):

- `http_request_duration_seconds_custom` - HTTP request latency histogram
- `http_requests_total_custom` - Total HTTP requests counter
- `database_query_duration_seconds_custom` - Database query latency histogram
- `application_errors_total` - Application errors counter

| Metric Name | Type | Exemplars | Use Case |
|-------------|------|-----------|----------|
| `http_request_duration_seconds_custom` | Histogram | ✅ | Link slow requests to traces |
| `http_requests_total_custom` | Counter | ✅ | Link request spikes to traces |
| `database_query_duration_seconds_custom` | Histogram | ✅ | Link slow queries to traces |
| `application_errors_total` | Counter | ✅ | Link errors to failing traces |
| `active_users_total` | UpDownCounter | ❌ | Current state, no trace link needed |
| `http_request_duration_seconds` (OTEL) | Histogram | ❌ | OpenTelemetry limitation |
| `http_requests_total` (OTEL) | Counter | ❌ | OpenTelemetry limitation |

## Architecture

The application follows **MVC architecture** with:

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Models**: Data structures (Prisma ORM)
- **Middleware**: Request processing pipeline
- **Validators**: Input validation schemas (Joi)
- **Config**: Configuration modules for tracing, logging, metrics, and database

All operations are traced and linked to metrics via exemplars.

---

## Project Structure

```
tracing-app/
├── src/
│   ├── config/           # Configuration (tracing, metrics, logging, db)
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Prisma ORM models
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── validators/       # Joi validation schemas
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Database seeding
├── .env                  # Environment variables
├── package.json          # Dependencies
└── README.md             # This file
```

---

## Additional Documentation

- **[PREREQUISITES.md](./PREREQUISITES.md)** - Installation requirements and setup
- **[test-scenarios.md](./test-scenarios.md)** - Test scenarios for various use cases
- **[chaos-testing.md](./chaos-testing.md)** - Chaos engineering examples

---

## Tech Stack

- **Node.js** v18+
- **Express** v4.19+
- **PostgreSQL** v14+
- **Prisma ORM** v5.22+
- **OpenTelemetry** v0.54+
- **Winston** (logging)
- **Joi** (validation)
- **Prometheus** (metrics)
- **Tempo** (tracing backend)

---

## License

MIT
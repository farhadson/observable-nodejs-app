# Prerequisites and Installation Guide

## Required Software

### 1. Node.js (v18+ recommended)

**Check version:**
```
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

**Install via nvm (recommended):**
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. PostgreSQL (v14+ recommended)

**Ubuntu/Debian:**
```
sudo apt update
sudo apt install postgresql postgresql-contrib postgresql-client
```

**macOS:**
```
brew install postgresql@14
brew services start postgresql@14
```

**Check version:**
```
psql --version  # Should be >= 14.0
```

**Or use Docker:**
```
docker run --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tracing_db \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Prisma CLI

Installed automatically via npm (in devDependencies).

**After npm install, verify:**
```
npx prisma --version
```

### 4. Tempo (for tracing backend)

**Create `docker-compose.yml`:**
```
version: '3'
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317:4317"  # gRPC
      - "4318:4318"  # HTTP
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
```

**Create `tempo.yaml`:**
```
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces

metrics_generator:
  storage:
    path: /tmp/tempo/generator
```

**Start Tempo:**
```
docker-compose up -d
```

### 5. Prometheus (for metrics)

**Create `prometheus.yml`:**
```
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node-app'
    static_configs:
      - targets: ['localhost:9464']
  
  - job_name: 'node-app-custom'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics-custom'
```

**Run Prometheus:**
```
docker run -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

---

## Installation Steps

### 1. Clone and Install Dependencies

```
npm install
```

### 2. Setup Database

```
# Create .env file
cp .env.example .env

# Edit DATABASE_URL in .env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate
npx prisma migrate dev --name init

# Seed database (optional)
npm run prisma:seed
```

### 3. Start Application

```
# Development
npm run dev

# Production
npm start
```

### 4. Verify Installation

```
# Check health
curl http://localhost:3000/health

# Check OpenTelemetry metrics
curl http://localhost:9464/metrics

# Check custom metrics with exemplars
curl http://localhost:3000/metrics-custom
```

---

## Package Versions Used

- **Node.js**: v18+ (LTS)
- **PostgreSQL**: v14+
- **Prisma**: v5.22.0
- **Express**: v4.19.2
- **OpenTelemetry SDK**: v0.54.0
- **Winston**: v3.14.2
- **Joi**: v17.13.3

---

## Optional Tools

- **Prisma Studio**: GUI for database
  ```
  npm run prisma:studio
  ```
- **k6**: Load testing
  ```
  brew install k6
  ```
- **curl**: API testing (pre-installed on most systems)
- **Docker**: For running Tempo/Prometheus
```


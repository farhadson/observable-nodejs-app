/**
 * @fileoverview OpenTelemetry metrics and Prometheus exporter configuration.
 * Provides metrics instrumentation with exemplar support linking metrics to traces.
 * Implements dual metrics strategy: OpenTelemetry auto-instrumentation (port 9464)
 * and custom prom-client metrics with exemplars (port 3000).
 * @module config/metrics
 */

import { metrics, trace, context } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import client from 'prom-client';
import dotenv from 'dotenv';

dotenv.config();

// ============ OPENTELEMETRY METRICS (Port 9464) ============
// These are auto-exported but DON'T support exemplars

/**
 * OpenTelemetry Resource with service metadata
 * Provides service name and version for metric identification
 * @type {Resource}
 * @constant
 */
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'tracing-app',
  [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
});

/**
 * Prometheus Exporter for OpenTelemetry metrics
 * Exposes metrics at http://localhost:9464/metrics
 * These metrics do NOT support exemplars due to OpenTelemetry limitation
 * @type {PrometheusExporter}
 * @constant
 */
const prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.METRICS_PORT) || 9464,
}, () => {
  console.log(`Prometheus metrics available at http://localhost:${process.env.METRICS_PORT || 9464}/metrics`);
});

/**
 * OpenTelemetry MeterProvider
 * Manages metric instruments and exports to Prometheus
 * @type {MeterProvider}
 * @constant
 */
const meterProvider = new MeterProvider({
  resource,
  readers: [prometheusExporter],
});

// Set global meter provider for auto-instrumentation
metrics.setGlobalMeterProvider(meterProvider);

/**
 * Meter instance for creating metric instruments
 * @type {Meter}
 * @constant
 */
const meter = meterProvider.getMeter('app-metrics');

/**
 * HTTP request duration histogram (OpenTelemetry)
 * Tracks duration of HTTP requests in seconds
 * @type {Histogram}
 * @constant
 * @note Does NOT support exemplars - use httpDurationHistogram for exemplar support
 */
const httpRequestDuration_OTEL = meter.createHistogram('http_request_duration_seconds', {
  description: 'Duration of HTTP requests in seconds',
  unit: 'seconds',
});

/**
 * HTTP request counter (OpenTelemetry)
 * Tracks total number of HTTP requests
 * @type {Counter}
 * @constant
 * @note Does NOT support exemplars - use httpRequestCounterCustom for exemplar support
 */
const httpRequestCounter_OTEL = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

/**
 * Database query duration histogram (OpenTelemetry)
 * Tracks duration of database queries in seconds
 * @type {Histogram}
 * @constant
 * @note Does NOT support exemplars - use dbQueryHistogram for exemplar support
 */
const databaseQueryDuration_OTEL = meter.createHistogram('database_query_duration_seconds', {
  description: 'Duration of database queries in seconds',
  unit: 'seconds',
});

/**
 * Active users counter (OpenTelemetry)
 * Tracks current number of active users in the system
 * @type {UpDownCounter}
 * @constant
 * @note Gauges/UpDownCounters don't support exemplars by design (point-in-time values)
 */
const activeUsers = meter.createUpDownCounter('active_users_total', {
  description: 'Total number of active users',
});

// ============ CUSTOM PROM-CLIENT METRICS (Port 3000) ============
// These DO support exemplars (trace links)

/**
 * Custom Prometheus registry for prom-client metrics
 * Separate from OpenTelemetry registry to enable exemplar support
 * Exposed at http://localhost:3000/metrics-custom
 * @type {Registry}
 * @constant
 */
const promRegister = new client.Registry();

/**
 * HTTP request duration histogram WITH EXEMPLARS
 * Tracks HTTP request latency and links data points to traces
 * Labels: method (GET/POST/etc), route (/api/users), status_code (200/404/etc)
 * @type {Histogram}
 * @constant
 * @example
 * // Recorded automatically by recordHttpRequest()
 * // Prometheus query: histogram_quantile(0.95, http_request_duration_seconds_custom)
 */
const httpDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds_custom',
  help: 'Duration of HTTP requests in seconds with exemplars',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  enableExemplars: true,
  registers: [promRegister],
});

/**
 * HTTP request counter WITH EXEMPLARS
 * Tracks total HTTP requests and links spikes to specific traces
 * Labels: method (GET/POST/etc), route (/api/users), status_code (200/404/etc)
 * @type {Counter}
 * @constant
 * @example
 * // Recorded automatically by recordHttpRequest()
 * // Prometheus query: rate(http_requests_total_custom[5m])
 */
const httpRequestCounterCustom = new client.Counter({
  name: 'http_requests_total_custom',
  help: 'Total number of HTTP requests with exemplars',
  labelNames: ['method', 'route', 'status_code'],
  enableExemplars: true,
  registers: [promRegister],
});

/**
 * Database query duration histogram WITH EXEMPLARS
 * Tracks database query latency and links slow queries to traces
 * Labels: operation (CREATE/READ/UPDATE/DELETE), table (users/posts/etc)
 * @type {Histogram}
 * @constant
 * @example
 * // Recorded by recordDatabaseQuery()
 * // Prometheus query: histogram_quantile(0.99, database_query_duration_seconds_custom)
 */
const dbQueryHistogram = new client.Histogram({
  name: 'database_query_duration_seconds_custom',
  help: 'Duration of database queries with exemplars',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  enableExemplars: true,
  registers: [promRegister],
});

/**
 * Application error counter WITH EXEMPLARS
 * Tracks errors and links error spikes to failing traces
 * Labels: error_type (ValidationError/DatabaseError/etc), route (/api/users)
 * @type {Counter}
 * @constant
 * @example
 * // Recorded by recordError()
 * // Prometheus query: sum(rate(application_errors_total[5m])) by (error_type)
 */
const errorCounter = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors with exemplars',
  labelNames: ['error_type', 'route'],
  enableExemplars: true,
  registers: [promRegister],
});

// ============ RECORDING FUNCTIONS ============

/**
 * Record HTTP request metrics with trace exemplar
 * Records both OpenTelemetry metrics (no exemplar) and custom metrics (with exemplar)
 * Automatically extracts trace context from active span
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc)
 * @param {string} route - Express route path (/api/users/:id)
 * @param {number} statusCode - HTTP status code (200, 404, 500, etc)
 * @param {number} duration - Request duration in seconds
 * @returns {void}
 * 
 * @example
 * // Called automatically by metrics middleware in app.js
 * recordHttpRequest('POST', '/api/users', 201, 0.145);
 * 
 * @example
 * // Results in Prometheus metrics:
 * // http_requests_total_custom{method="POST",route="/api/users",status_code="201"} 1
 * // http_request_duration_seconds_custom{method="POST",route="/api/users",status_code="201"} 0.145
 * // With exemplar: {traceId="abc123...", spanId="xyz789..."}
 */
const recordHttpRequest = (method, route, statusCode, duration) => {
  // Record OpenTelemetry metrics (no exemplars)
  httpRequestCounter_OTEL.add(1, { method, route, status_code: statusCode });
  httpRequestDuration_OTEL.record(duration, { method, route, status_code: statusCode });

  // Get current span for exemplar
  const span = trace.getSpan(context.active());
  const exemplarLabels = {};
  
  if (span) {
    const spanContext = span.spanContext();
    exemplarLabels.traceId = spanContext.traceId;
    exemplarLabels.spanId = spanContext.spanId;
  }

  // Record prom-client metrics with exemplars
  httpRequestCounterCustom.inc(
    { method, route, status_code: statusCode },
    1,
    exemplarLabels
  );
  
  httpDurationHistogram.observe(
    { method, route, status_code: statusCode },
    duration,
    exemplarLabels
  );
};

/**
 * Record database query metrics with trace exemplar
 * Records both OpenTelemetry metrics (no exemplar) and custom metrics (with exemplar)
 * Automatically extracts trace context from active span
 * @param {string} operation - Database operation type (CREATE, READ, UPDATE, DELETE, RAW_SQL)
 * @param {string} table - Database table name (users, posts, etc)
 * @param {number} duration - Query duration in seconds
 * @returns {void}
 * 
 * @example
 * // Called by databaseService or models
 * recordDatabaseQuery('CREATE', 'users', 0.052);
 * recordDatabaseQuery('RAW_SQL', 'multiple', 0.123);
 * 
 * @example
 * // Results in Prometheus metrics:
 * // database_query_duration_seconds_custom{operation="CREATE",table="users"} 0.052
 * // With exemplar: {traceId="abc123...", spanId="xyz789..."}
 */
const recordDatabaseQuery = (operation, table, duration) => {
  // OpenTelemetry metric
  databaseQueryDuration_OTEL.record(duration, { operation, table });

  // Get exemplar
  const span = trace.getSpan(context.active());
  const exemplarLabels = {};
  
  if (span) {
    const spanContext = span.spanContext();
    exemplarLabels.traceId = spanContext.traceId;
    exemplarLabels.spanId = spanContext.spanId;
  }

  // prom-client metric with exemplar
  dbQueryHistogram.observe({ operation, table }, duration, exemplarLabels);
};

/**
 * Record application error with trace exemplar
 * Links error occurrences to the trace where the error happened
 * Automatically extracts trace context from active span
 * @param {string} errorType - Error type/name (ValidationError, DatabaseError, UnauthorizedError, etc)
 * @param {string} route - Route where error occurred (/api/users, /api/auth/login, etc)
 * @returns {void}
 * 
 * @example
 * // Called by error handler middleware
 * recordError('ValidationError', '/api/users');
 * recordError('DatabaseError', '/api/posts');
 * 
 * @example
 * // Results in Prometheus metrics:
 * // application_errors_total{error_type="ValidationError",route="/api/users"} 1
 * // With exemplar: {traceId="abc123...", spanId="xyz789..."}
 * // Click exemplar in Grafana → Jump to trace in Tempo showing the error
 */
const recordError = (errorType, route) => {
  const span = trace.getSpan(context.active());
  const exemplarLabels = {};
  
  if (span) {
    const spanContext = span.spanContext();
    exemplarLabels.traceId = spanContext.traceId;
    exemplarLabels.spanId = spanContext.spanId;
  }

  errorCounter.inc({ error_type: errorType, route }, 1, exemplarLabels);
};

/**
 * @exports
 * @description Exports metrics and recording functions for application use
 * 
 * OpenTelemetry metrics (port 9464, no exemplars):
 * - httpRequestDuration: HTTP request duration histogram
 * - httpRequestCounter: HTTP request counter
 * - databaseQueryDuration: Database query duration histogram
 * - activeUsers: Active users gauge
 * 
 * Recording functions (auto-add exemplars):
 * - recordHttpRequest: Record HTTP request with trace link
 * - recordDatabaseQuery: Record database query with trace link
 * - recordError: Record error with trace link
 * 
 * Registry:
 * - promRegister: Custom registry for /metrics-custom endpoint
 * - meterProvider: OpenTelemetry meter provider
 */
export {
  // OpenTelemetry metrics (no exemplars)
  httpRequestDuration_OTEL as httpRequestDuration,
  httpRequestCounter_OTEL as httpRequestCounter,
  databaseQueryDuration_OTEL as databaseQueryDuration,
  activeUsers,
  
  // Recording functions (with exemplars)
  recordHttpRequest,
  recordDatabaseQuery,
  recordError,
  
  // Registries
  promRegister,
  meterProvider,
};

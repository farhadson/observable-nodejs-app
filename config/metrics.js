/**
 * @fileoverview OpenTelemetry metrics and Prometheus exporter configuration.
 * Provides metrics instrumentation for application observability.
 * Implements dual metrics strategy: OpenTelemetry auto-instrumentation (port 9464)
 * and custom prom-client metrics (port 3000).
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

// helper: parse OTEL_RESOURCE_ATTRIBUTES like "key1=val1,key2=val2"
const parseOtelResourceAttributes = (raw) => {
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split(',')
      .map((pair) => {
        const [k, ...rest] = pair.split('=');
        return [k?.trim(), rest.join('=').trim()];
      })
      .filter(([k, v]) => k && v)
  );
};

/**
 * OpenTelemetry Resource with service metadata
 * Provides service name and version for metric identification
 * @type {Resource}
 * @constant
 */
const resource = new Resource({
  ...parseOtelResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES),
  [ATTR_SERVICE_NAME]:
    process.env.OTEL_SERVICE_NAME ||
    process.env.SERVICE_NAME ||
    'tracing-app',
  [ATTR_SERVICE_VERSION]:
    process.env.OTEL_SERVICE_VERSION ||
    process.env.SERVICE_VERSION ||
    '1.0.0',
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
 */
const httpRequestCounter_OTEL = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

/**
 * Database query duration histogram (OpenTelemetry)
 * Tracks duration of database queries in seconds
 * @type {Histogram}
 * @constant
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
 */
const activeUsers = meter.createUpDownCounter('active_users_total', {
  description: 'Total number of active users',
});

// ============ CUSTOM PROM-CLIENT METRICS (Port 3000) ============
// These are custom metrics separate from OpenTelemetry

/**
 * Custom Prometheus registry for prom-client metrics
 * Separate from OpenTelemetry registry
 * Exposed at http://localhost:3000/metrics-custom
 * @type {Registry}
 * @constant
 */
const promRegister = new client.Registry();

// Enable OpenMetrics format (supports exemplars but we're not using them yet)
// promRegister.setContentType(client.Registry.OPENMETRICS_CONTENT_TYPE);

// Use standard Prometheus text format (displays in browser)
// Note: OpenMetrics format (OPENMETRICS_CONTENT_TYPE) is needed for exemplars,
// but causes browsers to download instead of display. We'll use standard format for now.

// Use standard Prometheus text format (displays in browser)
promRegister.setContentType(client.Registry.PROMETHEUS_CONTENT_TYPE);

/**
 * HTTP request duration histogram (custom)
 * Tracks HTTP request latency with custom buckets
 * Labels: method (GET/POST/etc), route (/api/users), status_code (200/404/etc)
 * @type {Histogram}
 * @constant
 * @example
 * // Recorded automatically by recordHttpRequest()
 * // Prometheus query: histogram_quantile(0.95, http_request_duration_seconds_custom)
 */
const httpDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds_custom',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [promRegister],
});

/**
 * HTTP request counter (custom)
 * Tracks total HTTP requests
 * Labels: method (GET/POST/etc), route (/api/users), status_code (200/404/etc)
 * @type {Counter}
 * @constant
 * @example
 * // Recorded automatically by recordHttpRequest()
 * // Prometheus query: rate(http_requests_total_custom[5m])
 */
const httpRequestCounterCustom = new client.Counter({
  name: 'http_requests_total_custom',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [promRegister],
});

/**
 * Database query duration histogram (custom)
 * Tracks database query latency
 * Labels: operation (CREATE/READ/UPDATE/DELETE), table (users/posts/etc)
 * @type {Histogram}
 * @constant
 * @example
 * // Recorded by recordDatabaseQuery()
 * // Prometheus query: histogram_quantile(0.99, database_query_duration_seconds_custom)
 */
const dbQueryHistogram = new client.Histogram({
  name: 'database_query_duration_seconds_custom',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [promRegister],
});

/**
 * Application error counter (custom)
 * Tracks errors by type and route
 * Labels: error_type (ValidationError/DatabaseError/etc), route (/api/users)
 * @type {Counter}
 * @constant
 * @example
 * // Recorded by recordError()
 * // Prometheus query: sum(rate(application_errors_total[5m])) by (error_type)
 */
const errorCounter = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'route'],
  registers: [promRegister],
});

// ============ RECORDING FUNCTIONS ============

/**
 * Record HTTP request metrics
 * Records both OpenTelemetry metrics and custom prom-client metrics
 * @param {string} method - HTTP method (GET, POST, etc)
 * @param {string} route - Route path (/api/users, /health, etc)
 * @param {number} statusCode - HTTP status code (200, 404, etc)
 * @param {number} duration - Request duration in seconds
 * @returns {void}
 * 
 * @example
 * recordHttpRequest('GET', '/api/users', 200, 0.123);
 */
const recordHttpRequest = (method, route, statusCode, duration) => {
  // Validate inputs
  if (typeof duration !== 'number' || isNaN(duration) || duration < 0) {
    console.error('❌ Invalid duration for metrics:', { method, route, statusCode, duration });
    return;
  }
  
  if (typeof statusCode !== 'number' || isNaN(statusCode)) {
    console.error('❌ Invalid statusCode for metrics:', { method, route, statusCode, duration });
    return;
  }

  const routePath = String(route || 'unknown');
  const methodStr = String(method || 'UNKNOWN');
  
  // Record OpenTelemetry metrics
  try {
    httpRequestDuration_OTEL.record(duration, { 
      method: methodStr, 
      route: routePath, 
      status_code: statusCode 
    });
    httpRequestCounter_OTEL.add(1, { 
      method: methodStr, 
      route: routePath, 
      status_code: statusCode 
    });
  } catch (error) {
    console.error('❌ Error recording OpenTelemetry metrics:', error.message);
  }

  // Record custom prom-client metrics
  try {
    const labels = { 
      method: methodStr, 
      route: routePath, 
      status_code: statusCode 
    };
    
    // Simple recording without exemplars (stable and working)
    httpDurationHistogram.observe(labels, duration);
    httpRequestCounterCustom.inc(labels, 1);
    
  } catch (error) {
    console.error('❌ Error recording prom-client metrics:', {
      error: error.message,
      method: methodStr,
      route: routePath,
      statusCode,
      duration
    });
  }
};

/**
 * Record database query metrics
 * Records both OpenTelemetry and custom prom-client metrics
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
 */
const recordDatabaseQuery = (operation, table, duration) => {
  // OpenTelemetry metric
  try {
    databaseQueryDuration_OTEL.record(duration, { operation, table });
  } catch (error) {
    console.error('❌ Error recording OpenTelemetry database metric:', error.message);
  }

  // prom-client metric
  try {
    dbQueryHistogram.observe({ operation, table }, duration);
  } catch (error) {
    console.error('❌ Error recording prom-client database metric:', error.message);
  }
};

/**
 * Record application error
 * Links error occurrences for tracking and alerting
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
 */
const recordError = (errorType, route) => {
  try {
    errorCounter.inc({ error_type: errorType, route }, 1);
  } catch (error) {
    console.error('❌ Error recording error metric:', error.message);
  }
};

/**
 * @exports
 * @description Exports metrics and recording functions for application use
 * 
 * OpenTelemetry metrics (port 9464, auto-exported):
 * - httpRequestDuration: HTTP request duration histogram
 * - httpRequestCounter: HTTP request counter
 * - databaseQueryDuration: Database query duration histogram
 * - activeUsers: Active users gauge
 * 
 * Recording functions:
 * - recordHttpRequest: Record HTTP request metrics
 * - recordDatabaseQuery: Record database query metrics
 * - recordError: Record error metrics
 * 
 * Registry:
 * - promRegister: Custom registry for /metrics-custom endpoint
 * - meterProvider: OpenTelemetry meter provider
 */
export {
  // OpenTelemetry metrics (port 9464)
  httpRequestDuration_OTEL as httpRequestDuration,
  httpRequestCounter_OTEL as httpRequestCounter,
  databaseQueryDuration_OTEL as databaseQueryDuration,
  activeUsers,
  
  // Recording functions
  recordHttpRequest,
  recordDatabaseQuery,
  recordError,
  
  // Registries
  promRegister,
  meterProvider,
};

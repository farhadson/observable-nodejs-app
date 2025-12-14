/**
 * @fileoverview OpenTelemetry tracing configuration and SDK initialization.
 * Configures trace export to Tempo via OTLP (HTTP or gRPC).
 * @module config/tracing
 */

// import grpc from '@grpc/grpc-js';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

// (optional but highly recommended) enable OTel internal diagnostics
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

/**
 * OTLP protocol type (http or grpc)
 * @type {string}
 * @constant
 */
const protocol = process.env.OTLP_TRACE_PROTOCOL || 'http';

/**
 * OTLP trace destination URL
 * @type {string}
 * @constant
 */
const url = process.env.OTLP_TRACE_DEST_URL || 'http://localhost:4318/v1/traces';

/**
 * Trace exporter instance (HTTP or gRPC)
 * @type {OTLPTraceExporterHTTP|OTLPTraceExporterGRPC}
 */
let traceExporter;

if (protocol === 'grpc') {
  const grpc = await import('@grpc/grpc-js');
  console.log('Using gRPC exporter for traces (HTTP/2)');

  // Accept either "test-trace.com:4317" or "http(s)://test-trace.com:4317"
  const normalized = url.startsWith('http://') || url.startsWith('https://')
    ? new URL(url)
    : new URL(`http://${url}`);

  const isTls = normalized.protocol === 'https:';
  const defaultGrpcPort = process.env.OTLP_TRACE_GRPC_PORT || '4317';

  // CA override for TLS (self-signed / private CA)
  let rootCert;
  const caPath = process.env.OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE;
  if (isTls && caPath) {
    try {
      rootCert = fs.readFileSync(caPath);
      console.log(`Loaded OTLP gRPC root CA from ${caPath}`);
    } catch (err) {
      console.error(`Failed to read OTLP gRPC CA file at ${caPath}:`, err.message);
    }
  }

  traceExporter = new OTLPTraceExporterGRPC({
    // exporter expects host:port (no path); this is the common working form
    url: `${normalized.hostname}:${normalized.port || defaultGrpcPort}`,
    // If your Tempo endpoint is behind TLS, you must use createSsl()
    credentials: isTls 
      ? grpc.credentials.createSsl(rootCert) // use provided CA if present
      : grpc.credentials.createInsecure(),
  });
} else {
  console.log('Using HTTP exporter for traces (HTTP/1.1)');
  traceExporter = new OTLPTraceExporterHTTP({ url });
}

/**
//  * Service resource attributes
//  * @type {Resource}
//  * @constant
//  */
// const resource = new Resource({
//   [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'tracing-app',
//   [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
// });

/**
 * Parse OpenTelemetry resource attributes from an env-style string.
 *
 * Expected format is a comma-separated list of `key=value` pairs, e.g.
 * `deployment.environment=dev,service.namespace=demo`.
 * Invalid or empty pairs are ignored.
 *
 * @param {string | undefined | null} raw - Raw attributes string (usually from OTEL_RESOURCE_ATTRIBUTES).
 * @returns {Record<string, string>} Parsed attributes as a key/value map.
 *
 * @example
 * parseOtelResourceAttributes('deployment.environment=dev,service.namespace=demo');
 * // => { 'deployment.environment': 'dev', 'service.namespace': 'demo' }
 */
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
 * Service resource attributes
 * @type {Resource}
 * @constant
 */
const resource = new Resource({
  // 1) generic OTEL resource attributes, e.g. deployment.environment, service.namespace, etc.
  //    OTEL_RESOURCE_ATTRIBUTES="deployment.environment=dev,service.namespace=demo"
  ...parseOtelResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES),

  // 2) service.name with precedence: OTEL_SERVICE_NAME -> SERVICE_NAME -> default
  [ATTR_SERVICE_NAME]:
    process.env.OTEL_SERVICE_NAME ||
    process.env.SERVICE_NAME ||
    'tracing-app',

  // 3) service.version with precedence: OTEL_SERVICE_VERSION -> SERVICE_VERSION -> default
  [ATTR_SERVICE_VERSION]:
    process.env.OTEL_SERVICE_VERSION ||
    process.env.SERVICE_VERSION ||
    '1.0.0',
});


/**
 * OpenTelemetry Node SDK instance
 * @type {NodeSDK}
 * @constant
 */
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    ...getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-grpc': { enabled: false }, // Only affects whether this application’s own gRPC client/server calls get auto-instrumented      

      // ✅ HTTP client instrumentation - adds peer.service for outbound calls
      '@opentelemetry/instrumentation-http': {
        // Enrich client (outgoing) spans with remote service identifier
        requestHook: (span, request) => {
          // peer.service is the key attribute for service-graph edges
          if (span.kind === 1) { // SpanKind.CLIENT = 1
            const hostname = request.hostname || request.host || 'unknown';
            span.setAttribute('peer.service', hostname);
            
            // Also set net.peer.name for better observability
            span.setAttribute('net.peer.name', hostname);
            if (request.port) {
              span.setAttribute('net.peer.port', request.port);
            }
          }
        },
      
        // Server spans: add http.route (low-cardinality route template)
        // This is critical for span metrics aggregation
        responseHook: (span, response) => {
          // Response hook can access final status
          // (Auto-instrumentation already sets most attributes)
        },
        
        // Ignore health checks to reduce noise
        ignoreIncomingRequestHook: (request) => {
          return request.url === '/health';
        },
      },

      // ✅ Express instrumentation - span name = METHOD + route
      '@opentelemetry/instrumentation-express': {
        spanNameHook: (info, defaultName) => {
          // Only rename the span for the actual request handler layer
          // (that’s where a route template exists)
          if (info?.layerType !== 'request_handler') return defaultName;

          const method = info?.request?.method || 'HTTP';
          // Prefer info.route (provided by Express instrumentation) over req.route
          const route = info?.route
            ? `${info?.request?.baseUrl || ''}${info.route}`
            : null;

          return route ? `${method} ${route}` : defaultName;
        },

        requestHook: (span, info) => {
          if (info?.layerType !== 'request_handler') return;

          const route = info?.route
            ? `${info?.request?.baseUrl || ''}${info.route}`
            : null;

          if (route) span.setAttribute('http.route', route);
        },
      },
    }),
  ],
});

// Checked Start of SDK
try {
  sdk.start();
  console.log('Tracing initialized');
} catch (err) {
  console.log('Error initializing tracing', err);
}

/**
 * Graceful shutdown handler for tracing
 */
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export { sdk };

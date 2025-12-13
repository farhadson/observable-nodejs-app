/**
 * @fileoverview OpenTelemetry tracing configuration and SDK initialization.
 * Configures trace export to Tempo via OTLP (HTTP or gRPC).
 * @module config/tracing
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import dotenv from 'dotenv';

dotenv.config();

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
  console.log('Using gRPC exporter for traces (HTTP/2)');
  traceExporter = new OTLPTraceExporterGRPC({
    url: url.replace('http://', '').replace('https://', ''),
  });
} else {
  console.log('Using HTTP exporter for traces (HTTP/1.1)');
  traceExporter = new OTLPTraceExporterHTTP({ url });
}

/**
 * Service resource attributes
 * @type {Resource}
 * @constant
 */
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'tracing-app',
  [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
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
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable fs instrumentation to reduce noise
      },
    }),
  ],
});

// Start SDK
sdk.start();

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

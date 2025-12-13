import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

console.log('🔍 Testing trace export to Tempo...');

// Create exporter with debugging
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
  headers: {},
  timeoutMillis: 10000,
});

// Create SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'test-trace-export',
  }),
  traceExporter: exporter,
});

// Start SDK
sdk.start();
console.log('✅ SDK started');

// Create a test trace
const tracer = trace.getTracer('test-tracer');

const span = tracer.startSpan('test-span');
span.setAttribute('test.attribute', 'test-value');
span.addEvent('test-event', { message: 'Testing trace export' });

console.log(`📝 Created span with TraceID: ${span.spanContext().traceId}`);
console.log(`📝 SpanID: ${span.spanContext().spanId}`);

// End span
span.end();

// Give time for export
setTimeout(async () => {
  console.log('🔄 Flushing traces...');
  await sdk.shutdown();
  console.log('✅ SDK shutdown complete');
  console.log('');
  console.log('Now check Tempo:');
  console.log(`curl "http://localhost:3200/api/traces/${span.spanContext().traceId}"`);
  process.exit(0);
}, 2000);

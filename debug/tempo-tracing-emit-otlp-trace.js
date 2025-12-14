import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const protocol = process.env.OTLP_TRACE_PROTOCOL || 'http';
const dest = process.env.OTLP_TRACE_DEST_URL || 'http://localhost:4318/v1/traces';

console.log('🔍 Testing trace export to Tempo...');
console.log(`Protocol: ${protocol}`);
console.log(`Destination: ${dest}`);

let traceExporter;

if (protocol === 'grpc') {
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-grpc');
  // For grpc exporter, dest usually looks like "localhost:4317"
  traceExporter = new OTLPTraceExporter({ url: dest, timeoutMillis: 10000 });
} else {
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  // For http exporter, dest usually looks like "http://localhost:4318/v1/traces"
  traceExporter = new OTLPTraceExporter({ url: dest, timeoutMillis: 10000 });
}

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'test-trace-export',
  }),
  traceExporter,
});

await sdk.start();
console.log('✅ SDK started');

const tracer = trace.getTracer('test-tracer');

const span = tracer.startSpan('test-span');
span.setAttribute('test.attribute', 'test-value');
span.addEvent('test-event', { message: 'Testing trace export' });

const { traceId, spanId } = span.spanContext();
console.log(`📝 Created span with TraceID: ${traceId}`);
console.log(`📝 SpanID: ${spanId}`);

span.end();

setTimeout(async () => {
  console.log('🔄 Flushing traces...');
  await sdk.shutdown();
  console.log('✅ SDK shutdown complete');
  console.log('');
  console.log('Now check Tempo:');
  console.log(`curl "http://localhost:3200/api/traces/${traceId}"`);
  process.exit(0);
}, 2000);

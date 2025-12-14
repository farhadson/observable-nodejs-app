/**
 * @fileoverview OpenTelemetry Logs SDK pipeline that exports LogRecords to a local JSONL file.
 *
 * Why this exists (vs Winston):
 * - Winston is an application logger (human-first output). It can include trace/span IDs,
 *   but it does not natively produce OpenTelemetry LogRecords with Resource + Scope metadata.
 * - The OpenTelemetry Logs SDK produces LogRecords following the OTel Logs data model, which
 *   supports standardized fields (timestamps, severity, trace correlation) and structured
 *   attributes, plus Resource and InstrumentationScope information.
 *
 * This module intentionally performs *no network export*. It writes JSON lines to disk.
 *
 * @module config/otel-logs
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

import { logs } from '@opentelemetry/api-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

dotenv.config();

/**
 * @typedef {Object} FileLogRecordExporterOptions
 * @property {string} filePath Absolute or relative path to the JSONL file to append to.
 */

/**
 * A minimal OpenTelemetry Logs SDK exporter that appends LogRecords to a JSON Lines file.
 *
 * Notes:
 * - Each LogRecord becomes one JSON object per line (JSONL), which is ingestion-friendly.
 * - This exporter is synchronous (appendFileSync) to keep it simple and robust.
 *   For very high throughput, switch to an async buffered writer or a stream.
 */
class FileLogRecordExporter {
  /**
   * @param {FileLogRecordExporterOptions} options Exporter options.
   */
  constructor({ filePath }) {
    /**
     * @type {string}
     * @private
     */
    this._filePath = filePath;
  }

  /**
   * Export a batch of LogRecords.
   *
   * The Logs SDK will call this method through the configured LogRecordProcessor.
   *
   * @param {import('@opentelemetry/sdk-logs').ReadableLogRecord[]} logRecords LogRecords to export.
   * @param {(result: {code: number}) => void} resultCallback Callback to indicate success/failure.
   * @returns {void}
   */
  export(logRecords, resultCallback) {
    try {
      fs.mkdirSync(path.dirname(this._filePath), { recursive: true });

      const payload =
        logRecords
          .map((r) =>
            JSON.stringify({
              /**
               * Timestamp when the event occurred (high-resolution tuple).
               * This is intentionally kept raw to avoid precision loss.
               */
              timestamp: r.hrTime,

              /** Log severity (text + numeric). */
              severityText: r.severityText,
              severityNumber: r.severityNumber,

              /** The log body; can be string or structured. */
              body: r.body,

              /** Per-record attributes (structured key/value). */
              attributes: r.attributes,

              /**
               * Resource attributes (shared “source of telemetry”).
               * Typically includes service.name, service.version, etc.
               */
              resource: r.resource?.attributes,

              /**
               * Instrumentation scope metadata (which library emitted it).
               * Useful for filtering and debugging instrumentation sources.
               */
              instrumentationScope: r.instrumentationScope,

              /** Trace correlation fields (when a span context is active). */
              traceId: r.spanContext?.traceId,
              spanId: r.spanContext?.spanId,
              traceFlags: r.spanContext?.traceFlags,
            })
          )
          .join('\n') + '\n';

      fs.appendFileSync(this._filePath, payload, { encoding: 'utf8' });

      // ExportResultCode.SUCCESS === 0
      resultCallback({ code: 0 });
    } catch (e) {
      // ExportResultCode.FAILED === 1
      resultCallback({ code: 1 });
    }
  }

  /**
   * Shutdown hook called by the SDK on shutdown.
   *
   * @returns {Promise<void>}
   */
  shutdown() {
    return Promise.resolve();
  }
}

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
 * Initialize the OpenTelemetry Logs SDK pipeline and register it globally.
 *
 * This:
 * - Creates a LoggerProvider with Resource metadata (service.name, service.version).
 * - Adds a BatchLogRecordProcessor that exports to a JSONL file.
 * - Sets the provider as the global LoggerProvider.
 *
 * @returns {LoggerProvider} The initialized LoggerProvider (useful for shutdown hooks).
 */
export function initOtelLogs() {
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

  const provider = new LoggerProvider({ resource });

  const filePath = process.env.OTEL_LOG_FILE_PATH || './logs/otel.jsonl';

  provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new FileLogRecordExporter({ filePath }))
  );

  logs.setGlobalLoggerProvider(provider);

  return provider;
}

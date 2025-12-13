/**
 * @fileoverview Winston logger configuration with OpenTelemetry trace context injection.
 * Provides structured logging with trace ID and span ID in every log entry.
 * @module config/logging
 */

import winston from 'winston';
import dotenv from 'dotenv';
import { trace, context } from '@opentelemetry/api';

dotenv.config();

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format with trace context
 * @type {winston.Logform.Format}
 */
const traceFormat = printf(({ level, message, timestamp, traceId, spanId, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} [${level}] [TraceID: ${traceId || 'N/A'}] [SpanID: ${spanId || 'N/A'}]: ${message} ${meta}`;
});

/**
 * Winston format to add OpenTelemetry trace context to logs
 * @returns {winston.Logform.Format} Winston format instance
 */
const addTraceContext = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.traceId = spanContext.traceId;
    info.spanId = spanContext.spanId;
  }
  return info;
});

/**
 * Create a Winston logger instance with specified log level
 * @param {string} [logLevel='info'] - Minimum log level to output
 * @returns {winston.Logger} Configured Winston logger instance
 * 
 * @example
 * const logger = createLogger('debug');
 * logger.debug('Debug message');
 */
const createLogger = (logLevel = 'info') => {
  return winston.createLogger({
    level: logLevel,
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      addTraceContext(),
      traceFormat
    ),
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          traceFormat
        ),
      }),
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH || './logs/app.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

/**
 * Default logger instance
 * @type {winston.Logger}
 * @constant
 */
const logger = createLogger(process.env.LOG_LEVEL || 'info');

export default logger;

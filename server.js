/**
 * @fileoverview Server entry point.
 * Starts the HTTP server and handles graceful shutdown.
 * @module server
 */

// ✅ Import tracing FIRST (before anything else)
await import('./config/tracing.js');
await import('./config/otel-logs.js').then(m => m.initOtelLogs());

const { default: app } = await import('./app.js');
const { default: logger } = await import('./config/logging.js');
// import app from './app.js';
// import logger from './config/logging.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Server port number
 * @type {number}
 */
const PORT = process.env.PORT || 3000;

/**
 * HTTP server instance
 * @type {import('http').Server}
 */
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  // logger.info(`Custom metrics: http://localhost:${PORT}/metrics-custom`);
  // logger.info(`OpenTelemetry metrics: http://localhost:${process.env.METRICS_PORT || 9464}/metrics`);
  const customMetricsPath = process.env.CUSTOM_METRICS_PATH || '/metrics-custom';
  const metricsCustomPort = process.env.METRICS_CUSTOM_PORT;

  if (metricsCustomPort) {
    logger.info(`Custom metrics: http://localhost:${metricsCustomPort}${customMetricsPath}`);
  } else {
    logger.info(`Custom metrics: http://localhost:${PORT}${customMetricsPath}`);
  }

  logger.info(`OpenTelemetry metrics: http://localhost:${process.env.METRICS_PORT || 9464}/metrics`);

});

/**
 * Graceful shutdown handler
 * Closes HTTP server and exits process
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

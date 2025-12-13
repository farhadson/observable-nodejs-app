/**
 * @fileoverview Global error handling middleware for Express application.
 * Catches all errors thrown in the application and returns formatted responses.
 * Integrates with OpenTelemetry for error tracking and Winston for logging.
 * @module middleware/errorHandler
 */

import logger from '../config/logging.js';
import { trace, context } from '@opentelemetry/api';
import { recordError } from '../config/metrics.js';

/**
 * Global error handler middleware.
 * Catches all errors from routes and middleware, logs them, records in traces,
 * and sends appropriate HTTP responses to clients.
 * 
 * @param {Error} err - The error object thrown by the application
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 * 
 * @example
 * // In app.js:
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  // next is not used but is required for express to identify error handling middleware
  // Get current span for error tracking
  const span = trace.getSpan(context.active());
  
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message }); // code 2 = ERROR
  }

  // Log error with trace context
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    code: err.code,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  recordError(err.name || 'UnknownError', req.path);

  // Prepare error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Add specific error details for known error types
  if (err.code) {
    errorResponse.code = err.code;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
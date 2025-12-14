/**
 * @fileoverview Middleware to inject OpenTelemetry trace context into Express requests.
 * Adds trace ID and span ID to request object and response headers.
 * @module middleware/traceContext
 */

import { trace, context } from '@opentelemetry/api';

/**
 * Trace context middleware
 * Extracts trace ID and span ID from active span and injects into request/response
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 * 
 * @example
 * // In app.js:
 * app.use(traceContextMiddleware);
 * 
 * // In route handler:
 * console.log(req.traceId); // Access trace ID
 */
const traceContextMiddleware = (req, res, next) => {
  const span = trace.getSpan(context.active());
  
  if (span) {
    const spanContext = span.spanContext();
    req.rootSpan = span;
    req.traceId = spanContext.traceId;
    req.spanId = spanContext.spanId;  
    
    // Add trace ID to response headers for client tracking
    res.setHeader('X-Trace-Id', spanContext.traceId);
  }
  
  next();
};

export default traceContextMiddleware;

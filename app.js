/**
 * @fileoverview Main Express application configuration.
 * Sets up middleware, routes, error handling, and observability endpoints.
 * @module app
 */

import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chaosRoutes from './routes/chaosRoutes.js';
import traceContextMiddleware from './middleware/traceContext.js';
import errorHandler from './middleware/errorHandler.js';
// import logger from './config/logging.js';
import { recordHttpRequest, promRegister } from './config/metrics.js';

/**
 * Express application instance
 * @type {import('express').Application}
 */
const app = express();

// ============ MIDDLEWARE ============

/**
 * Parse JSON request bodies
 */
app.use(express.json());

/**
 * Parse URL-encoded request bodies
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Inject OpenTelemetry trace context into requests
 */
app.use(traceContextMiddleware);

/**
 * Metrics middleware - records HTTP request metrics
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Next middleware
 */
/**
 * Metrics middleware - records HTTP request metrics
 * ✅ FIXED: Better route detection and timing
 */
app.use((req, res, next) => {
  const start = Date.now();
  
  // Capture metrics when response finishes
  const originalEnd = res.end;
  res.end = function(...args) {
    try {
      const duration = (Date.now() - start) / 1000;
      
      // Get route path (most reliable at response time)
      let route = 'unknown';
      if (req.route && req.route.path) {
        route = (req.baseUrl || '') + req.route.path;
      } else {
        route = req.path || req.url || 'unknown';
      }
      
      // Clean up route (remove query string)
      route = route.split('?')[0];
            
      if (req.rootSpan && route && typeof req.rootSpan.updateName === 'function') {
        req.rootSpan.updateName(`${req.method} ${route}`);
      }

      // Record metrics
      if (typeof duration === 'number' && !isNaN(duration) && duration >= 0 &&
          typeof res.statusCode === 'number' && !isNaN(res.statusCode)) {
        recordHttpRequest(req.method, route, res.statusCode, duration);
      }
    } catch (error) {
      console.error('❌ Metrics middleware error:', error.message);
    }
    
    // Call original end
    return originalEnd.apply(res, args);
  };
  
  next();
});

// ============ ROUTES ============

/**
 * Health check endpoint
 * @name GET /health
 * @function
 * @returns {Object} Health status and timestamp
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * Custom Prometheus metrics endpoint (legacy fallback).
 *
 * If METRICS_CUSTOM_PORT is set, the custom metrics server is started from config/metrics.js
 * and we should NOT expose this route on the main app port to avoid duplicates.
 */
if (!process.env.METRICS_CUSTOM_PORT) {
  const customMetricsPath = process.env.CUSTOM_METRICS_PATH || '/metrics-custom';

  app.get(customMetricsPath, async (req, res) => {
    try {
      res.set('Content-Type', promRegister.contentType);
      const metrics = await promRegister.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error);
    }
  });
}

/**
 * Mount API routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chaos', chaosRoutes);

/**
 * 404 handler for unmatched routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Global error handler middleware (must be last)
 */
app.use(errorHandler);

export default app;

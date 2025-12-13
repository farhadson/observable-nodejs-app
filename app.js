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
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
  });
  
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
 * Custom Prometheus metrics endpoint with exemplars
 * @name GET /metrics-custom
 * @function
 * @returns {string} Prometheus metrics in text format
 */
app.get('/metrics-custom', async (req, res) => {
  try {
    res.set('Content-Type', promRegister.contentType);
    const metrics = await promRegister.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

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

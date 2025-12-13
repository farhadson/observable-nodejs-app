/**
 * @fileoverview Chaos engineering routes for testing system resilience.
 * @module routes/chaosRoute
 */

import express from 'express';
import chaosController from '../controllers/chaosController.js';

/**
 * Express router for chaos engineering endpoints
 * @type {express.Router}
 * @constant
 */
const router = express.Router();

/**
 * Configure latency injection
 * @name POST /api/chaos/latency
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/latency', chaosController.configureLatency);

/**
 * Configure random failure injection
 * @name POST /api/chaos/random-failure
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/random-failure', chaosController.configureRandomFailure);

/**
 * Trigger memory leak simulation
 * @name POST /api/chaos/memory-leak
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/memory-leak', chaosController.triggerMemoryLeak);

/**
 * Trigger CPU spike simulation
 * @name POST /api/chaos/cpu-spike
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/cpu-spike', chaosController.triggerCPUSpike);

/**
 * Trigger database error
 * @name POST /api/chaos/database-error
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/database-error', chaosController.triggerDatabaseError);

/**
 * Disable all chaos features
 * @name POST /api/chaos/disable-all
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/disable-all', chaosController.disableAll);

/**
 * Get chaos status
 * @name GET /api/chaos/status
 * @function
 * @memberof module:routes/chaosRoute
 */
router.get('/status', chaosController.getStatus);

/**
 * Circuit breaker test
 * @name POST /api/chaos/circuit-breaker-test
 * @function
 * @memberof module:routes/chaosRoute
 */
router.post('/circuit-breaker-test', chaosController.circuitBreakerTest);

export default router;

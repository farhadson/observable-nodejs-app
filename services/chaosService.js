/**
 * @fileoverview Chaos engineering service for testing system resilience.
 * Provides methods to inject latency, trigger failures, and simulate various error conditions.
 * @module services/chaosService
 */

import logger from '../config/logging.js';
import { trace } from '@opentelemetry/api';

/**
 * Chaos engineering service class
 * @class
 */
class ChaosService {
  /**
   * Initialize chaos service with configuration map
   * @constructor
   */
  constructor() {
    this.config = new Map();
    this.config.set('database', { latency: 0, failureRate: 0, enabled: false });
    this.config.set('api', { latency: 0, failureRate: 0, enabled: false });
    this.memoryLeakInterval = null;
  }

  /**
   * Inject latency delay into a service
   * @async
   * @param {string} service - Service name ('database' or 'api')
   * @param {number} [duration] - Duration in milliseconds (uses config if not provided)
   * @returns {Promise<void>}
   * 
   * @example
   * await chaosService.injectLatency('database', 2000);
   */
  async injectLatency(service, duration) {
    const config = this.config.get(service);
    if (!config || !config.enabled || config.latency === 0) {
      return;
    }

    const tracer = trace.getTracer('chaos-service');
    const span = tracer.startSpan('chaos.latency');
    try {
      span.setAttribute('chaos.service', service);
      span.setAttribute('chaos.latency_ms', duration || config.latency);
      logger.warn(`Chaos: Injecting ${duration || config.latency}ms latency into ${service}`);
      await new Promise(resolve => setTimeout(resolve, duration || config.latency));
    } finally {
      span.end();
    }
  }

  /**
   * Randomly trigger failure based on configured probability
   * @async
   * @param {string} service - Service name
   * @returns {Promise<boolean>} True if failure was triggered, false otherwise
   * 
   * @example
   * const failed = await chaosService.injectRandomFailure('database');
   */
  async injectRandomFailure(service) {
    const config = this.config.get(service);
    if (!config || !config.enabled || config.failureRate === 0) {
      return false;
    }

    const tracer = trace.getTracer('chaos-service');
    const span = tracer.startSpan('chaos.random_failure');
    try {
      const shouldFail = Math.random() < config.failureRate;
      span.setAttribute('chaos.service', service);
      span.setAttribute('chaos.failure_rate', config.failureRate);
      span.setAttribute('chaos.failed', shouldFail);

      if (shouldFail) {
        logger.warn(`Chaos: Triggering random failure in ${service}`);
        const error = new Error(`Chaos-induced failure in ${service}`);
        span.recordException(error);
        return true;
      }

      return false;
    } finally {
      span.end();
    }
  }

  /**
   * Configure latency injection for a service
   * @param {string} service - Service name
   * @param {number} duration - Latency duration in milliseconds
   * @param {boolean} [enabled=true] - Enable or disable latency injection
   * @returns {void}
   * 
   * @example
   * chaosService.configureLatency('database', 1000, true);
   */
  configureLatency(service, duration, enabled = true) {
    const config = this.config.get(service) || {};
    config.latency = duration;
    config.enabled = enabled;
    this.config.set(service, config);
    logger.info(`Chaos: Configured latency for ${service}`, { duration, enabled });
  }

  /**
   * Configure random failure rate for a service
   * @param {string} service - Service name
   * @param {number} rate - Failure probability (0.0 to 1.0)
   * @param {boolean} [enabled=true] - Enable or disable failure injection
   * @returns {void}
   * 
   * @example
   * chaosService.configureFailureRate('database', 0.3, true);
   */
  configureFailureRate(service, rate, enabled = true) {
    const config = this.config.get(service) || {};
    config.failureRate = rate;
    config.enabled = enabled;
    this.config.set(service, config);
    logger.info(`Chaos: Configured failure rate for ${service}`, { rate, enabled });
  }

  /**
   * Simulate memory leak by continuously allocating memory
   * @param {number} [durationMs=30000] - Duration of memory leak in milliseconds
   * @returns {void}
   * 
   * @example
   * chaosService.simulateMemoryLeak(60000); // 60 seconds
   */
  simulateMemoryLeak(durationMs = 30000) {
    logger.warn('Chaos: Starting memory leak simulation', { duration: durationMs });
    const memoryLeakArray = [];
    let iterations = 0;

    this.memoryLeakInterval = setInterval(() => {
      // Allocate ~10MB per iteration
      memoryLeakArray.push(new Array(1000000).fill('*'.repeat(10)));
      iterations++;
      logger.warn('Chaos: Memory leak iteration', {
        iteration: iterations,
        arraySize: memoryLeakArray.length
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(this.memoryLeakInterval);
      logger.info('Chaos: Memory leak simulation ended');
    }, durationMs);
  }

  /**
   * Simulate CPU spike by running intensive calculations
   * @param {number} [durationMs=5000] - Duration of CPU spike in milliseconds
   * @returns {void}
   * 
   * @example
   * chaosService.simulateCPUSpike(10000); // 10 seconds
   */
  simulateCPUSpike(durationMs = 5000) {
    logger.warn('Chaos: Starting CPU spike simulation', { duration: durationMs });
    const tracer = trace.getTracer('chaos-service');
    const span = tracer.startSpan('chaos.cpu_spike');
    try {
      span.setAttribute('chaos.duration_ms', durationMs);
      const start = Date.now();
      
      while (Date.now() - start < durationMs) {
        // Busy wait to consume CPU
        Math.sqrt(Math.random() * 1000000);
      }

      logger.info('Chaos: CPU spike simulation completed');
    } finally {
      span.end();
    }
  }

  /**
   * Simulate database error with specific error type
   * @async
   * @param {string} [errorType='CONNECTION_ERROR'] - Type of database error
   * @throws {Error} Database error based on error type
   * 
   * @example
   * try {
   *   await chaosService.simulateDatabaseError('TIMEOUT');
   * } catch (error) {
   *   console.error('Database error:', error.message);
   * }
   */
  async simulateDatabaseError(errorType = 'CONNECTION_ERROR') {
    const tracer = trace.getTracer('chaos-service');
    const span = tracer.startSpan('chaos.database_error');
    try {
      span.setAttribute('chaos.error_type', errorType);
      logger.error('Chaos: Simulating database error', { errorType });

      const errors = {
        CONNECTION_ERROR: new Error('ECONNREFUSED: Connection refused'),
        TIMEOUT: new Error('ETIMEDOUT: Query timeout'),
        DEADLOCK: new Error('Deadlock detected'),
        CONSTRAINT_VIOLATION: new Error('Unique constraint violation'),
      };

      const error = errors[errorType] || new Error('Unknown database error');
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Disable all chaos engineering features
   * @returns {void}
   * 
   * @example
   * chaosService.disableAllChaos();
   */
  disableAllChaos() {
    for (const [service, config] of this.config.entries()) {
      config.enabled = false;
      config.latency = 0;
      config.failureRate = 0;
    }

    if (this.memoryLeakInterval) {
      clearInterval(this.memoryLeakInterval);
    }

    logger.info('Chaos: All chaos engineering features disabled');
  }

  /**
   * Get current chaos configuration status
   * @returns {Object} Current configuration for all services
   * 
   * @example
   * const status = chaosService.getStatus();
   * console.log(status);
   */
  getStatus() {
    return Object.fromEntries(this.config);
  }
}

export default new ChaosService();

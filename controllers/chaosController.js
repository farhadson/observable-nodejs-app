/**
 * @fileoverview Chaos engineering controller for testing system resilience.
 * @module controllers/chaosController
 */

import chaosService from '../services/chaosService.js';
import logger from '../config/logging.js';

/**
 * Chaos engineering controller class
 * @class
 */
class ChaosController {
  /**
   * Configure latency injection for a service
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async configureLatency(req, res, next) {
    try {
      const { service = 'database', duration = 1000, enabled = true } = req.body;
      chaosService.configureLatency(service, duration, enabled);
      
      res.status(200).json({
        success: true,
        message: `Latency configured for ${service}`,
        config: { service, duration, enabled },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Configure random failure injection for a service
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async configureRandomFailure(req, res, next) {
    try {
      const { service = 'database', probability = 0.5, enabled = true } = req.body;

      if (probability < 0 || probability > 1) {
        return res.status(400).json({
          success: false,
          message: 'Probability must be between 0 and 1',
        });
      }

      chaosService.configureFailureRate(service, probability, enabled);
      
      res.status(200).json({
        success: true,
        message: `Random failures configured for ${service}`,
        config: { service, probability, enabled },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger memory leak simulation
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async triggerMemoryLeak(req, res, next) {
    try {
      const { duration = 30000 } = req.body;
      setImmediate(() => chaosService.simulateMemoryLeak(duration));
      
      res.status(200).json({
        success: true,
        message: 'Memory leak simulation started',
        duration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger CPU spike simulation
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async triggerCPUSpike(req, res, next) {
    try {
      const { duration = 5000 } = req.body;
      setImmediate(() => chaosService.simulateCPUSpike(duration));
      
      res.status(200).json({
        success: true,
        message: 'CPU spike simulation started',
        duration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger database error simulation
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async triggerDatabaseError(req, res, next) {
    try {
      const { errorType = 'CONNECTION_ERROR' } = req.body;
      await chaosService.simulateDatabaseError(errorType);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable all chaos engineering features
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async disableAll(req, res, next) {
    try {
      chaosService.disableAllChaos();
      res.status(200).json({
        success: true,
        message: 'All chaos features disabled',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current chaos configuration status
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getStatus(req, res, next) {
    try {
      const status = chaosService.getStatus();
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test circuit breaker pattern with multiple failures
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async circuitBreakerTest(req, res, next) {
    try {
      const errors = [];

      for (let i = 0; i < 5; i++) {
        try {
          await chaosService.simulateDatabaseError('TIMEOUT');
        } catch (error) {
          errors.push({ attempt: i + 1, error: error.message });
        }
      }

      logger.warn('Circuit breaker test completed', { errorCount: errors.length });
      res.status(500).json({
        success: false,
        message: 'Circuit breaker test - multiple failures triggered',
        errors,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ChaosController();

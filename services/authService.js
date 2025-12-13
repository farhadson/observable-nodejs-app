/**
 * @fileoverview Authentication service for password hashing and JWT operations.
 * Handles user authentication, password encryption, and token generation/verification.
 * @module services/authService
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import logger from '../config/logging.js';
import { trace } from '@opentelemetry/api';

dotenv.config();

/**
 * Authentication service class
 * @class
 */
class AuthService {
  /**
   * Hash a plain text password using bcrypt
   * @async
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} Hashed password
   * @throws {Error} If hashing fails
   * 
   * @example
   * const hashedPassword = await authService.hashPassword('myPassword123');
   */
  async hashPassword(password) {
    const tracer = trace.getTracer('auth-service');
    return tracer.startActiveSpan('auth.hashPassword', async (span) => {
      try {
        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);
        logger.info('Password hashed successfully');
        return hashed;
      } catch (error) {
        span.recordException(error);
        logger.error('Password hashing failed', { error: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Compare a plain text password with a hashed password
   * @async
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password to compare against
   * @returns {Promise<boolean>} True if passwords match, false otherwise
   * @throws {Error} If comparison fails
   * 
   * @example
   * const isValid = await authService.comparePassword('myPassword123', hashedPassword);
   */
  async comparePassword(password, hashedPassword) {
    const tracer = trace.getTracer('auth-service');
    return tracer.startActiveSpan('auth.comparePassword', async (span) => {
      try {
        const isMatch = await bcrypt.compare(password, hashedPassword);
        logger.info('Password comparison completed', { matched: isMatch });
        return isMatch;
      } catch (error) {
        span.recordException(error);
        logger.error('Password comparison failed', { error: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate a JWT token for authenticated user
   * @param {Object} payload - Token payload
   * @param {number} payload.userId - User ID
   * @param {string} payload.email - User email
   * @returns {string} Signed JWT token
   * @throws {Error} If token generation fails
   * 
   * @example
   * const token = authService.generateToken({ userId: 1, email: 'user@example.com' });
   */
  generateToken({ userId, email }) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('auth.generateToken');
    try {
      const token = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );
      logger.info('JWT token generated', { userId });
      return token;
    } catch (error) {
      span.recordException(error);
      logger.error('Token generation failed', { error: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @returns {number} returns.userId - User ID from token
   * @returns {string} returns.email - User email from token
   * @throws {Error} If token verification fails
   * 
   * @example
   * const decoded = authService.verifyToken(token);
   * console.log(decoded.userId, decoded.email);
   */
  verifyToken(token) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('auth.verifyToken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      logger.info('Token verified successfully');
      return decoded;
    } catch (error) {
      span.recordException(error);
      logger.error('Token verification failed', { error: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}

export default new AuthService();

/**
 * @fileoverview User service handling business logic for user operations.
 * Manages user CRUD operations, authentication, and integrates with Prisma ORM.
 * @module services/userService
 */

import UserModel from '../models/userModel.js';
import authService from './authService.js';
import logger from '../config/logging.js';
import { trace } from '@opentelemetry/api';

/**
 * User service class
 * @class
 */
class UserService {
  /**
   * Create a new user with hashed password
   * @async
   * @param {Object} userData - User data object
   * @param {string} userData.email - User email address
   * @param {string} userData.password - Plain text password
   * @param {string} userData.name - User full name
   * @returns {Promise<Object>} Created user object (without password)
   * @throws {Error} If user creation fails
   * 
   * @example
   * const user = await userService.createUser({
   *   email: 'john@example.com',
   *   password: 'password123',
   *   name: 'John Doe'
   * });
   */
  async createUser(userData) {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.create', async (span) => {
      try {
        const { email, password, name } = userData;
        span.setAttribute('user.email', email);

        const hashedPassword = await authService.hashPassword(password);
        const user = await UserModel.create({
          email,
          password: hashedPassword,
          name,
        });

        logger.info('User created successfully', { userId: user.id });
        return user;
      } catch (error) {
        span.recordException(error);
        logger.error('User creation failed', { error: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get user by ID
   * @async
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   * @throws {Error} If retrieval fails
   * 
   * @example
   * const user = await userService.getUserById(1);
   */
  async getUserById(userId) {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.getById', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        const user = await UserModel.findById(userId);

        if (!user) {
          logger.warn('User not found', { userId });
          return null;
        }

        logger.info('User retrieved successfully', { userId });
        return user;
      } catch (error) {
        span.recordException(error);
        logger.error('User retrieval failed', { error: error.message, userId });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get all users
   * @async
   * @returns {Promise<Array<Object>>} Array of user objects
   * @throws {Error} If retrieval fails
   * 
   * @example
   * const users = await userService.getAllUsers();
   */
  async getAllUsers() {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.getAll', async (span) => {
      try {
        const users = await UserModel.findAll();
        logger.info('Users retrieved successfully', { count: users.length });
        return users;
      } catch (error) {
        span.recordException(error);
        logger.error('Users retrieval failed', { error: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Update user by ID
   * @async
   * @param {number} userId - User ID
   * @param {Object} updates - Fields to update
   * @param {string} [updates.name] - New name
   * @param {string} [updates.email] - New email
   * @returns {Promise<Object|null>} Updated user object or null if not found
   * @throws {Error} If update fails
   * 
   * @example
   * const user = await userService.updateUser(1, { name: 'Jane Doe' });
   */
  async updateUser(userId, updates) {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.update', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        const user = await UserModel.update(userId, updates);
        logger.info('User updated successfully', { userId });
        return user;
      } catch (error) {
        span.recordException(error);
        if (error.code === 'P2025') {
          logger.warn('User not found for update', { userId });
          return null;
        }
        logger.error('User update failed', { error: error.message, userId });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Delete user by ID
   * @async
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If deletion fails
   * 
   * @example
   * const deleted = await userService.deleteUser(1);
   */
  async deleteUser(userId) {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.delete', async (span) => {
      try {
        span.setAttribute('user.id', userId);
        await UserModel.delete(userId);
        logger.info('User deleted successfully', { userId });
        return true;
      } catch (error) {
        span.recordException(error);
        if (error.code === 'P2025') {
          logger.warn('User not found for deletion', { userId });
          return false;
        }
        logger.error('User deletion failed', { error: error.message, userId });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Authenticate user with email and password
   * @async
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} Authentication result with user and token, or null
   * @returns {Object} returns.user - User object without password
   * @returns {string} returns.token - JWT token
   * @throws {Error} If authentication process fails
   * 
   * @example
   * const result = await userService.authenticateUser('john@example.com', 'password123');
   * if (result) {
   *   console.log(result.token);
   * }
   */
  async authenticateUser(email, password) {
    const tracer = trace.getTracer('user-service');
    return tracer.startActiveSpan('user.authenticate', async (span) => {
      try {
        span.setAttribute('user.email', email);
        const user = await UserModel.findByEmail(email);

        if (!user) {
          logger.warn('Authentication failed - user not found', { email });
          return null;
        }

        const isValidPassword = await authService.comparePassword(password, user.password);
        if (!isValidPassword) {
          logger.warn('Authentication failed - invalid password', { email });
          return null;
        }

        const token = authService.generateToken({ userId: user.id, email: user.email });
        logger.info('User authenticated successfully', { userId: user.id });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
      } catch (error) {
        span.recordException(error);
        logger.error('Authentication failed', { error: error.message, email });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export default new UserService();

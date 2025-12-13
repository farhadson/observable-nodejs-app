/**
 * @fileoverview User model using Prisma ORM for database operations.
 * @module models/userModel
 */

import prisma from '../config/database.js';
import logger from '../config/logging.js';

/**
 * User model class providing database operations
 * @class
 */
class UserModel {
  /**
   * Find user by ID
   * @async
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   * 
   * @example
   * const user = await UserModel.findById(1);
   */
  async findById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find user by email
   * @async
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object with password or null
   * 
   * @example
   * const user = await UserModel.findByEmail('john@example.com');
   */
  async findByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Error finding user by email', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Find all users
   * @async
   * @returns {Promise<Array<Object>>} Array of user objects
   * 
   * @example
   * const users = await UserModel.findAll();
   */
  async findAll() {
    try {
      return await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      logger.error('Error finding all users', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new user
   * @async
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - Hashed password
   * @param {string} userData.name - User name
   * @returns {Promise<Object>} Created user object without password
   * 
   * @example
   * const user = await UserModel.create({
   *   email: 'john@example.com',
   *   password: 'hashedPassword',
   *   name: 'John Doe'
   * });
   */
  async create(userData) {
    try {
      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (error) {
      logger.error('Error creating user', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user by ID
   * @async
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user object
   * 
   * @example
   * const user = await UserModel.update(1, { name: 'Jane Doe' });
   */
  async update(id, updates) {
    try {
      return await prisma.user.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      logger.error('Error updating user', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @async
   * @param {number} id - User ID
   * @returns {Promise<Object>} Deleted user object
   * 
   * @example
   * await UserModel.delete(1);
   */
  async delete(id) {
    try {
      return await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting user', { error: error.message, id });
      throw error;
    }
  }
}

export default new UserModel();

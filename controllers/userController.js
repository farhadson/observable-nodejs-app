/**
 * @fileoverview User controller handling CRUD operations for users.
 * @module controllers/userController
 */

import userService from '../services/userService.js';
// import logger from '../config/logging.js';

/**
 * User controller class
 * @class
 */
class UserController {
  /**
   * Create a new user
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async create(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      // if (error.code === '23505') {  // PostgreSQL error code
      if (error.code === 'P2002') {  // Prisma unique constraint error
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }
      next(error);
    }
  }

  /**
   * Get all users
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async getById(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user by ID
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async update(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const user = await userService.updateUser(userId, req.body);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user by ID
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async delete(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const deleted = await userService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();

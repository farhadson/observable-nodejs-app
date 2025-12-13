/**
 * @fileoverview Authentication controller handling login operations.
 * @module controllers/authController
 */

import userService from '../services/userService.js';
import logger from '../config/logging.js';

/**
 * Authentication controller class
 * @class
 */
class AuthController {
  /**
   * Handle user login
   * @async
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware
   * @returns {Promise<void>}
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await userService.authenticateUser(email, password);

      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      logger.info('User logged in successfully', { userId: result.user.id });
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

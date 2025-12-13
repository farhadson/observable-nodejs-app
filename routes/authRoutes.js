/**
 * @fileoverview Authentication routes for login and registration.
 * @module routes/authRoutes
 */

import express from 'express';
import authController from '../controllers/authController.js';
import validate from '../middleware/validation.js';
import { loginSchema } from '../validators/userValidator.js';

/**
 * Express router for authentication endpoints
 * @type {express.Router}
 * @constant
 */
const router = express.Router();

/**
 * User login route
 * @name POST /api/auth/login
 * @function
 * @memberof module:routes/authRoutes
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @returns {Object} 200 - Login successful with JWT token
 * @returns {Object} 401 - Invalid credentials
 */
router.post('/login', validate(loginSchema), authController.login);

export default router;

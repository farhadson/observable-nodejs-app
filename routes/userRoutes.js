/**
 * @fileoverview User CRUD routes.
 * @module routes/userRoutes
 */

import express from 'express';
import userController from '../controllers/userController.js';
import validate from '../middleware/validation.js';
import { createUserSchema, updateUserSchema } from '../validators/userValidator.js';

/**
 * Express router for user endpoints
 * @type {express.Router}
 * @constant
 */
const router = express.Router();

/**
 * Get all users
 * @name GET /api/users
 * @function
 * @memberof module:routes/userRoutes
 * @returns {Object} 200 - Array of users
 */
router.get('/', userController.getAll);

/**
 * Get user by ID
 * @name GET /api/users/:id
 * @function
 * @memberof module:routes/userRoutes
 * @param {string} req.params.id - User ID
 * @returns {Object} 200 - User object
 * @returns {Object} 404 - User not found
 */
router.get('/:id', userController.getById);

/**
 * Create new user
 * @name POST /api/users
 * @function
 * @memberof module:routes/userRoutes
 * @param {Object} req.body - User data
 * @returns {Object} 201 - Created user
 * @returns {Object} 409 - Email already exists
 */
router.post('/', validate(createUserSchema), userController.create);

/**
 * Update user by ID
 * @name PUT /api/users/:id
 * @function
 * @memberof module:routes/userRoutes
 * @param {string} req.params.id - User ID
 * @param {Object} req.body - Updated user data
 * @returns {Object} 200 - Updated user
 * @returns {Object} 404 - User not found
 */
router.put('/:id', validate(updateUserSchema), userController.update);

/**
 * Delete user by ID
 * @name DELETE /api/users/:id
 * @function
 * @memberof module:routes/userRoutes
 * @param {string} req.params.id - User ID
 * @returns {Object} 200 - Deletion successful
 * @returns {Object} 404 - User not found
 */
router.delete('/:id', userController.delete);

export default router;

/**
 * @fileoverview Validation middleware using Joi schemas.
 * Validates request body, params, and query against provided Joi schema.
 * @module middleware/validation
 */

import logger from '../config/logging.js';

/**
 * Create validation middleware from Joi schema
 * @param {import('joi').Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 * 
 * @example
 * import Joi from 'joi';
 * import validate from './middleware/validation.js';
 * 
 * const userSchema = Joi.object({
 *   email: Joi.string().email().required(),
 *   password: Joi.string().min(6).required()
 * });
 * 
 * router.post('/users', validate(userSchema), userController.create);
 */
const validate = (schema) => {
  /**
   * Validation middleware function
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next middleware function
   * @returns {void}
   */
  return (req, res, next) => {
    const dataToValidate = { ...req.body, ...req.params, ...req.query };

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        message: detail.message,
        path: detail.path,
      }));

      logger.warn('Validation failed', { errors });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req properties with validated values
    Object.assign(req.body, value);
    Object.assign(req.params, value);
    Object.assign(req.query, value);

    next();
  };
};

export default validate;

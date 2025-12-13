/**
 * @fileoverview Joi validation schemas for user operations.
 * @module validators/userValidator
 */

import Joi from 'joi';

/**
 * Schema for creating a new user
 * @type {Joi.ObjectSchema}
 * @constant
 */
const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  name: Joi.string().min(2).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'any.required': 'Name is required',
  }),
});

/**
 * Schema for updating an existing user
 * @type {Joi.ObjectSchema}
 * @constant
 */
const updateUserSchema = Joi.object({
  email: Joi.string().email().messages({
    'string.email': 'Please provide a valid email address',
  }),
  name: Joi.string().min(2).messages({
    'string.min': 'Name must be at least 2 characters long',
  }),
}).min(1); // At least one field must be present

/**
 * Schema for user login
 * @type {Joi.ObjectSchema}
 * @constant
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export { createUserSchema, updateUserSchema, loginSchema };

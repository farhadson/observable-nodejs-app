/**
 * @fileoverview Prisma Client singleton configuration.
 * Provides centralized database access for the application.
 * @module config/database
 */

import { PrismaClient } from '@prisma/client';
import logger from './logging.js';

/**
 * Prisma Client instance with query logging
 * @type {PrismaClient}
 * @constant
 */
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

/**
 * Log all queries with Winston
 */
prisma.$on('query', (e) => {
  logger.debug('Prisma Query', {
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

/**
 * Log errors
 */
prisma.$on('error', (e) => {
  logger.error('Prisma Error', { error: e.message });
});

/**
 * Log connection events
 */
prisma.$on('info', (e) => {
  logger.info('Prisma Info', { message: e.message });
});

/**
 * Handle application shutdown
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma Client disconnected');
});

export default prisma;

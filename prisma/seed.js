/**
 * @fileoverview Database seeding script for initial data population.
 * @module prisma/seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Main seed function
 * @async
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🌱 Starting database seed...');

  /**
   * Hashed password for demo users
   * @type {string}
   */
  const hashedPassword = await bcrypt.hash('password123', 10);

  /**
   * Create demo users
   */
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
    },
  });

  console.log('✅ Created users:', { user1, user2 });
  console.log('🌱 Database seeding completed!');
}

/**
 * Execute main function and handle errors
 */
main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

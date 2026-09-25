import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, seedInitialData, prisma } from './db.js';

async function main() {
  console.log('Running database seed script...');
  await initDatabase();
  await seedInitialData();
  console.log('Seed completed successfully.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

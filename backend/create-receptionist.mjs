import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const gym = await prisma.gym.findFirst();
const existing = await prisma.user.findFirst({ where: { gymId: gym.id, username: 'smoke_receptionist' } });
if (!existing) {
  await prisma.user.create({
    data: {
      gymId: gym.id,
      username: 'smoke_receptionist',
      passwordHash: await bcrypt.hash('Recept@123', 12),
      fullName: 'Smoke Receptionist',
      role: 'receptionist',
    },
  });
  console.log('Receptionist created');
} else {
  console.log('Receptionist already exists');
}
await prisma.$disconnect();

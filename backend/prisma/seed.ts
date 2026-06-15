import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const gymName = process.env.INITIAL_GYM_NAME || 'O2O Gym';
  const ownerUsername = process.env.INITIAL_OWNER_USERNAME || 'admin';
  const ownerPassword = process.env.INITIAL_OWNER_PASSWORD || 'Admin@123';
  const ownerFullName = process.env.INITIAL_OWNER_FULLNAME || 'System Owner';

  let gym = await prisma.gym.findFirst({ where: { name: gymName } });

  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: gymName,
        nameAr: 'صالة O2O الرياضية',
        city: process.env.INITIAL_GYM_CITY || 'El-Menoufia',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
      },
    });
    console.log(`✅ Gym created: ${gym.name} (${gym.id})`);
  } else {
    console.log(`ℹ️  Gym already exists: ${gym.name}`);
  }

  const existingOwner = await prisma.user.findFirst({
    where: { gymId: gym.id, role: 'owner' },
  });

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const owner = await prisma.user.create({
      data: {
        gymId: gym.id,
        username: ownerUsername,
        passwordHash,
        fullName: ownerFullName,
        fullNameAr: 'مالك النظام',
        role: 'owner',
      },
    });
    console.log(`✅ Owner created: ${owner.username}`);
  } else {
    console.log(`ℹ️  Owner already exists: ${existingOwner.username}`);
  }

  const plans = [
    { name: 'Daily', nameAr: 'يومي', planType: 'daily' as const, durationDays: 1, price: 50 },
    { name: 'Half Month', nameAr: 'نصف شهر', planType: 'half_month' as const, durationDays: 15, price: 250 },
    { name: 'Monthly', nameAr: 'شهري', planType: 'monthly' as const, durationDays: 30, price: 400 },
    { name: 'Quarterly', nameAr: 'ربع سنوي', planType: 'quarterly' as const, durationDays: 90, price: 1000 },
    { name: '10 Sessions', nameAr: '10 جلسات', planType: 'session' as const, sessionsCount: 10, price: 300 },
  ];

  const existingPlans = await prisma.subscriptionPlan.count({ where: { gymId: gym.id } });
  if (existingPlans === 0) {
    for (const plan of plans) {
      await prisma.subscriptionPlan.create({ data: { gymId: gym.id, ...plan } });
    }
    console.log(`✅ ${plans.length} subscription plans created`);
  } else {
    console.log(`ℹ️  Plans already exist (${existingPlans})`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

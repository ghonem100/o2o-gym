// Production-friendly seed (plain Node ESM — no ts-node required).
// Usage: node prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('🌱 Seeding database...');

  const gymName = process.env.INITIAL_GYM_NAME || 'O2O Gym';
  const ownerUsername = process.env.INITIAL_OWNER_USERNAME || 'admin';
  const ownerPassword = process.env.INITIAL_OWNER_PASSWORD || 'Admin@123';
  const ownerFullName = process.env.INITIAL_OWNER_FULLNAME || 'System Owner';

  // ── Platform super admin (no gym) ──
  const superUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026';
  const existingSuper = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!existingSuper) {
    await prisma.user.create({
      data: {
        gymId: null,
        username: superUsername,
        passwordHash: await bcrypt.hash(superPassword, 12),
        fullName: process.env.SUPER_ADMIN_FULLNAME || 'Ghonem',
        fullNameAr: 'مدير المنصة',
        role: 'super_admin',
        isActive: true,
      },
    });
    console.log(`✅ Super admin created: ${superUsername}`);
  } else {
    console.log(`ℹ️  Super admin already exists: ${existingSuper.username}`);
  }

  const gymSlug = process.env.INITIAL_GYM_SLUG || 'o2o-gym';
  let gym = await prisma.gym.findFirst({ where: { name: gymName } });
  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: gymName,
        nameAr: 'صالة O2O الرياضية',
        slug: gymSlug,
        subscriptionStatus: 'active',
        city: process.env.INITIAL_GYM_CITY || 'El-Menoufia',
        currency: 'EGP',
        timezone: 'Africa/Cairo',
      },
    });
    console.log(`✅ Gym created: ${gym.name} (${gym.id}) — /gym/${gym.slug}`);
  } else {
    console.log(`ℹ️  Gym already exists: ${gym.name} — /gym/${gym.slug}`);
  }

  const existingOwner = await prisma.user.findFirst({ where: { gymId: gym.id, role: 'owner' } });
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
    { name: 'Daily', nameAr: 'يومي', planType: 'daily', durationDays: 1, price: 50 },
    { name: 'Half Month', nameAr: 'نصف شهر', planType: 'half_month', durationDays: 15, price: 250 },
    { name: 'Monthly', nameAr: 'شهري', planType: 'monthly', durationDays: 30, price: 400 },
    { name: 'Quarterly', nameAr: 'ربع سنوي', planType: 'quarterly', durationDays: 90, price: 1000 },
    { name: '10 Sessions', nameAr: '10 جلسات', planType: 'session', sessionsCount: 10, price: 300 },
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

  // One-time backfill: convert legacy 'GYM...' barcodes (or missing ones) to the
  // numeric member number so staff can type the member number to check in.
  const legacy = await prisma.member.findMany({
    where: { OR: [{ barcode: { startsWith: 'GYM' } }, { barcode: null }] },
    select: { id: true, memberNumber: true },
  });
  let fixed = 0;
  for (const m of legacy) {
    const numeric = m.memberNumber.replace(/[^0-9]/g, '');
    if (!numeric) continue;
    try {
      await prisma.member.update({ where: { id: m.id }, data: { barcode: numeric } });
      fixed++;
    } catch {
      // barcode unique collision — leave as-is
    }
  }
  if (fixed > 0) console.log(`✅ Backfilled ${fixed} member barcode(s) to numeric member number`);

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

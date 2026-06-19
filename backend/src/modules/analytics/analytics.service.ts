import { prisma } from '../../lib/prisma';

export async function getDashboardKPIs(gymId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const [
    totalMembers,
    activeMembers,
    todayCheckIns,
    todayRevenue,
    monthRevenue,
    lastMonthRevenue,
    monthExpenses,
    expiringCount,
    newMembersThisMonth,
    todayProductSales,
    monthProductSales,
  ] = await prisma.$transaction([
    prisma.member.count({ where: { gymId } }),
    prisma.subscription.count({ where: { gymId, status: 'active' } }),
    prisma.attendanceLog.count({ where: { gymId, checkInDate: today } }),
    prisma.payment.aggregate({
      where: { gymId, paymentDate: today, isRefunded: false },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { gymId, paymentDate: { gte: thisMonthStart }, isRefunded: false },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { gymId, paymentDate: { gte: lastMonthStart, lte: lastMonthEnd }, isRefunded: false },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { gymId, expenseDate: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: {
        gymId, status: 'active',
        endDate: { lte: new Date(Date.now() + 3 * 86400000), gte: today },
      },
    }),
    prisma.member.count({ where: { gymId, createdAt: { gte: thisMonthStart } } }),
    prisma.productSale.aggregate({
      where: { gymId, createdAt: { gte: today } },
      _sum: { totalPrice: true },
    }),
    prisma.productSale.aggregate({
      where: { gymId, createdAt: { gte: thisMonthStart } },
      _sum: { totalPrice: true },
    }),
  ]);

  const todayProductRev = Number(todayProductSales._sum.totalPrice ?? 0);
  const monthProductRev = Number(monthProductSales._sum.totalPrice ?? 0);
  const todayRev = Number(todayRevenue._sum.amount ?? 0) + todayProductRev;
  const monthRev = Number(monthRevenue._sum.amount ?? 0) + monthProductRev;
  const lastMonthRev = Number(lastMonthRevenue._sum.amount ?? 0);
  const monthExp = Number(monthExpenses._sum.amount ?? 0);

  return {
    totalMembers,
    activeMembers,
    todayCheckIns,
    todayRevenue: todayRev,
    todayProductRevenue: todayProductRev,
    monthRevenue: monthRev,
    monthProductRevenue: monthProductRev,
    lastMonthRevenue: lastMonthRev,
    revenueGrowth: lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev) * 100 : null,
    monthExpenses: monthExp,
    netProfit: monthRev - monthExp,
    expiringCount,
    newMembersThisMonth,
  };
}

export async function getRevenueReport(gymId: string, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const payments = await prisma.payment.findMany({
    where: { gymId, paymentDate: { gte: from, lte: to }, isRefunded: false },
    select: { paymentDate: true, amount: true, paymentMethod: true },
    orderBy: { paymentDate: 'asc' },
  });

  const byDay: Record<string, { date: string; revenue: number; count: number }> = {};
  for (const p of payments) {
    const key = p.paymentDate.toISOString().slice(0, 10);
    if (!byDay[key]) byDay[key] = { date: key, revenue: 0, count: 0 };
    byDay[key].revenue += Number(p.amount);
    byDay[key].count += 1;
  }

  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + Number(p.amount);
  }

  return {
    dailyRevenue: Object.values(byDay),
    byMethod,
    totalRevenue: payments.reduce((s, p) => s + Number(p.amount), 0),
    totalTransactions: payments.length,
  };
}

export async function getMembersStats(gymId: string) {
  const today = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

  const [
    total,
    newLast30,
    newPrev30,
    byPlan,
    byGender,
  ] = await prisma.$transaction([
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.member.count({ where: { gymId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.subscription.groupBy({
      by: ['planId'],
      where: { gymId, status: 'active' },
      _count: { memberId: true },
    }),
    prisma.member.groupBy({
      by: ['gender'],
      where: { gymId },
      _count: { id: true },
    }),
  ]);

  const planIds = byPlan.map((b) => b.planId);
  const plans = await prisma.subscriptionPlan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, name: true },
  });
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

  return {
    total,
    newLast30Days: newLast30,
    growthRate: newPrev30 > 0 ? ((newLast30 - newPrev30) / newPrev30) * 100 : null,
    byPlan: byPlan.map((b) => ({
      plan: planMap[b.planId] ?? 'Unknown',
      count: b._count.memberId,
    })),
    byGender: byGender.map((g) => ({ gender: g.gender ?? 'unknown', count: g._count.id })),
  };
}

export async function getAttendanceStats(gymId: string, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const logs = await prisma.attendanceLog.findMany({
    where: { gymId, checkInDate: { gte: from, lte: to } },
    select: { checkInDate: true, checkInTime: true, checkInMethod: true },
  });

  const byDay: Record<string, number> = {};
  const byHour: Record<number, number> = {};
  const byMethod: Record<string, number> = {};

  for (const log of logs) {
    const day = log.checkInDate.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;

    const hour = new Date(log.checkInTime).getHours();
    byHour[hour] = (byHour[hour] ?? 0) + 1;

    byMethod[log.checkInMethod] = (byMethod[log.checkInMethod] ?? 0) + 1;
  }

  const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

  return {
    totalCheckIns: logs.length,
    dailyCheckIns: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    byHour: Object.entries(byHour).map(([hour, count]) => ({ hour: parseInt(hour), count })).sort((a, b) => a.hour - b.hour),
    byMethod,
    peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
    avgDailyCheckIns: logs.length / Math.max(1, Object.keys(byDay).length),
  };
}

export async function getNewMembersByMonth(gymId: string, months = 12) {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const members = await prisma.member.findMany({
    where: { gymId, createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    map.set(d.toISOString().slice(0, 7), 0);
  }
  for (const m of members) {
    const key = m.createdAt.toISOString().slice(0, 7);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([month, count]) => ({ month, count }));
}

export async function getRetentionTrend(gymId: string, months = 6) {
  const result: { month: string; retention: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const [totalAtMonth, activeAtMonth] = await prisma.$transaction([
      prisma.member.count({ where: { gymId, createdAt: { lte: monthEnd } } }),
      prisma.subscription.count({
        where: {
          gymId,
          startDate: { lte: monthEnd },
          OR: [{ endDate: { gte: monthStart } }, { endDate: null }],
        },
      }),
    ]);

    result.push({
      month: monthStart.toISOString().slice(0, 7),
      retention: totalAtMonth > 0 ? (activeAtMonth / totalAtMonth) * 100 : 0,
    });
  }

  return result;
}

export async function getInactiveMembers(gymId: string, days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'active',
      OR: [
        { attendanceLogs: { none: {} } },
        { attendanceLogs: { every: { checkInDate: { lt: threshold } } } },
      ],
    },
    select: {
      id: true, fullName: true, memberNumber: true, phone: true, photoUrl: true,
      attendanceLogs: { orderBy: { checkInDate: 'desc' }, take: 1, select: { checkInDate: true } },
    },
    take: 100,
  });

  return members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    memberNumber: m.memberNumber,
    phone: m.phone,
    photoUrl: m.photoUrl,
    lastVisit: m.attendanceLogs[0]?.checkInDate ?? null,
  }));
}

export async function getRevenueBreakdown(gymId: string, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const payments = await prisma.payment.findMany({
    where: { gymId, paymentDate: { gte: from, lte: to }, isRefunded: false },
    select: {
      amount: true,
      paymentMethod: true,
      subscription: { select: { plan: { select: { planType: true, name: true } } } },
    },
  });

  const byPlanType: Record<string, number> = {};
  const byMethod: Record<string, number> = {};

  for (const p of payments) {
    const amount = Number(p.amount);
    const planType = p.subscription?.plan?.planType ?? 'unknown';
    byPlanType[planType] = (byPlanType[planType] ?? 0) + amount;
    byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + amount;
  }

  return {
    byPlanType: Object.entries(byPlanType).map(([type, amount]) => ({ type, amount })),
    byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
  };
}

export async function getAttendancePatterns(gymId: string, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const logs = await prisma.attendanceLog.findMany({
    where: { gymId, checkInDate: { gte: from, lte: to } },
    select: { checkInDate: true, checkInTime: true },
  });

  const byWeekday = new Array(7).fill(0);
  const byDay = new Map<string, number>();

  for (const log of logs) {
    const weekday = new Date(log.checkInTime).getDay();
    byWeekday[weekday] += 1;
    const day = log.checkInDate.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return {
    byWeekday: byWeekday.map((count, day) => ({ day, count })),
    dailySeries: Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    avgDaily: byDay.size > 0 ? logs.length / byDay.size : 0,
  };
}

export async function getProfitabilityReport(gymId: string, dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const [revenueData, expenseData, activeMembers, productRevenueData] = await prisma.$transaction([
    prisma.payment.aggregate({
      where: { gymId, paymentDate: { gte: from, lte: to }, isRefunded: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.findMany({
      where: { gymId, expenseDate: { gte: from, lte: to } },
      select: { category: true, amount: true },
    }),
    prisma.subscription.count({ where: { gymId, status: 'active' } }),
    prisma.productSale.aggregate({
      where: { gymId, createdAt: { gte: from, lte: toEnd } },
      _sum: { totalPrice: true },
    }),
  ]);

  const subscriptionRevenue = Number(revenueData._sum.amount ?? 0);
  const productRevenue = Number(productRevenueData._sum.totalPrice ?? 0);
  const totalRevenue = subscriptionRevenue + productRevenue;
  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;

  for (const e of expenseData) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount);
    totalExpenses += Number(e.amount);
  }

  return {
    totalRevenue,
    subscriptionRevenue,
    productRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
    arpm: activeMembers > 0 ? totalRevenue / activeMembers : 0,
    activeMembers,
    expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
    transactionCount: revenueData._count,
  };
}

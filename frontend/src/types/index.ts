export type Role = 'owner' | 'receptionist';

export interface User {
  id: string;
  username: string;
  fullName: string;
  fullNameAr: string | null;
  role: Role;
  gymId: string;
  gymName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Member {
  id: string;
  memberNumber: string;
  fullName: string;
  fullNameAr: string | null;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
  birthDate: string | null;
  photoUrl: string | null;
  barcode: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  activeSubscription?: ActiveSubscription | null;
  hasFace?: boolean;
}

export interface ActiveSubscription {
  id: string;
  status: string;
  endDate: string | null;
  sessionsRemaining: number | null;
  plan: { name: string; planType: PlanType };
}

export type PlanType = 'daily' | 'half_month' | 'monthly' | 'quarterly' | 'session';

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string | null;
  planType: PlanType;
  durationDays: number | null;
  sessionsCount: number | null;
  price: string;
  isActive: boolean;
}

export interface CheckInResult {
  success: boolean;
  member: {
    id: string;
    fullName: string;
    memberNumber: string;
    photoUrl: string | null;
  };
  subscription: {
    status: string;
    endDate: string | null;
    sessionsRemaining: number | null;
    planName: string;
    planType: string;
  } | null;
  alert: 'expired' | 'expiring_soon' | 'no_subscription' | null;
  attendanceId: string;
}

export interface DashboardKPIs {
  totalMembers: number;
  activeMembers: number;
  todayCheckIns: number;
  todayRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number | null;
  monthExpenses: number;
  netProfit: number;
  expiringCount: number;
  newMembersThisMonth: number;
}

export interface AttendanceStats {
  totalCheckIns: number;
  byHour: { hour: number; count: number }[];
  peakHour: { hour: number; count: number } | null;
  avgDailyCheckIns: number;
}

export interface RevenueReport {
  dailyRevenue: { date: string; revenue: number; count: number }[];
  byMethod: Record<string, number>;
  totalRevenue: number;
  totalTransactions: number;
}

export interface MembersStats {
  total: number;
  newLast30Days: number;
  growthRate: number | null;
  byPlan: { plan: string; count: number }[];
  byGender: { gender: string; count: number }[];
}

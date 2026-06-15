'use client';

import { AuthGuard } from '@/components/layout/auth-guard';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={['owner', 'receptionist']}>{children}</AuthGuard>;
}

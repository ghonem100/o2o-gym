'use client';

import { useParams } from 'next/navigation';
import { SlugProvider } from '@/providers/slug-context';

export default function GymSlugLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = String(params.slug ?? '');
  return <SlugProvider slug={slug}>{children}</SlugProvider>;
}

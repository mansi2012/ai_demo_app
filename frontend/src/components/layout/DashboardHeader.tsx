'use client';

import Link from 'next/link';
import { HeaderMenu } from '@/components/ui/HeaderMenu';

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title = 'LocalChat' }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-lg font-semibold text-emerald-600">
          {title}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <HeaderMenu />
      </div>
    </header>
  );
}

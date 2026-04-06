'use client';

import Sidebar from '@/components/layout/Sidebar';
import DynamicHeader from '@/components/layout/DynamicHeader';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useSidebar } from '@/components/layout/SidebarContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { width } = useSidebar();

  return (
    <>
      <Sidebar />
      <main
        className="bg-white transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: `${width}px` }}
      >
        <DynamicHeader />
        <Breadcrumbs />
        <div className="relative w-full">
          {children}
        </div>
      </main>
    </>
  );
}

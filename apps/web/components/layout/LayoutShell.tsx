"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DynamicHeader from "@/components/layout/DynamicHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useSidebar } from "@/components/layout/SidebarContext";
import DemoBanner from "../ui/DemoBanner";

const NO_SHELL_PATHS = ["/login"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { width } = useSidebar();
  const pathname = usePathname();

  if (NO_SHELL_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* 1. Banner di-set fixed dengan tinggi pasti (h-9 = 36px) dan z-index tinggi */}
        <div className="fixed top-0 left-0 w-full z-[9999] h-9">
          <DemoBanner />
        </div>

        {/* 2. Beri jarak pt-9 (padding-top: 36px) agar main content tidak tertabrak banner */}
        <div className="pt-9 flex-1">
          <Sidebar />

          <main className="bg-white transition-[margin-left] duration-300 ease-in-out min-h-[calc(100vh-36px)]" style={{ marginLeft: `${width}px` }}>
            <DynamicHeader />
            <Breadcrumbs />
            <div className="relative w-full">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}

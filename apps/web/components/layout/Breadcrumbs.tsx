"use client";

import { usePathname } from "next/navigation";
import React from "react";
import Link from "next/link"; // Import Link
import {
  HouseIcon,
  PresentationChartIcon,
  CaretRightIcon,
  UploadIcon,
  FileTextIcon,
  FunnelIcon,
  IconProps,
  TreeStructureIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
} from "@phosphor-icons/react";

// Menambahkan href opsional
type BreadcrumbItem = {
  Icon: React.ElementType<IconProps>;
  label: string;
  href?: string;
};

const STATIC_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: PresentationChartIcon, label: "Infographic Summary" },
  ],
  "/projects": [
    { Icon: ChartBarIcon, label: "Projects Analytics", href: "/" },
    { Icon: FileTextIcon, label: "All Projects" },
  ],
  "/upload": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: UploadIcon, label: "Data Management" },
  ],
  // ... sesuaikan href lainnya
};

function getDynamicBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [
    { Icon: ChartBarIcon, label: "Projects Analytics", href: "/" },
    { Icon: FileTextIcon, label: "All Projects", href: "/projects" },
  ];

  const segments = pathname.replace("/projects/", "").split("/");
  const projectId = segments[0];

  if (segments.length >= 1 && projectId) {
    base.push({
      Icon: FileTextIcon,
      label: "RS Tri Harsi",
      href: `/projects/${projectId}`,
    });
  }

  if (segments.length >= 2) {
    base.push({
      Icon: TreeStructureIcon,
      label: "Pekerjaan Struktur",
      href: `/projects/${projectId}/${segments[1]}`,
    });
  }

  // Item terakhir biasanya tidak perlu href karena itu posisi user saat ini
  if (segments.length >= 3) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg === "hpp" || lastSeg === "risk") {
      base.push({ Icon: FileTextIcon, label: "HPP & Project Performance" });
    } else {
      base.push({ Icon: BuildingOfficeIcon, label: "Detail Sumber Daya" });
    }
  }

  return base;
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  let items: BreadcrumbItem[];
  if (STATIC_BREADCRUMBS[pathname]) {
    items = STATIC_BREADCRUMBS[pathname];
  } else if (pathname.startsWith("/projects/")) {
    items = getDynamicBreadcrumbs(pathname);
  } else {
    items = STATIC_BREADCRUMBS["/"];
  }

  return (
    <div className="flex items-center bg-white border-b border-[#E9E9EA]" style={{ height: "50px", padding: "0 32px" }}>
      <div className="flex items-center bg-[#F9FAFB] rounded-lg px-4" style={{ height: "34px" }}>
        <div className="flex items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const { Icon } = item;

            // Bungkus konten dengan Link jika bukan item terakhir dan punya href
            const content = (
              <div className={`flex items-center gap-1.5 ${!isLast && item.href ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`}>
                <span className={isLast ? "text-gray-900" : "text-gray-500"}>
                  <Icon size={14} weight={isLast ? "fill" : "regular"} />
                </span>
                <span className={`text-[12px] ${isLast ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>{item.label}</span>
              </div>
            );

            return (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <CaretRightIcon size={8} className="text-gray-400" />}

                {!isLast && item.href ? <Link href={item.href}>{content}</Link> : content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

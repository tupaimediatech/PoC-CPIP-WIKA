"use client";

import { usePathname } from "next/navigation";
import React from "react";
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

// Menggunakan React.ElementType agar kita bisa mengirim props 'weight' secara dinamis
type BreadcrumbItem = {
  Icon: React.ElementType<IconProps>;
  label: string;
};

const STATIC_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/": [
    { Icon: HouseIcon, label: "Home" },
    { Icon: PresentationChartIcon, label: "Infographic Summary" },
  ],
  "/projects": [
    { Icon: ChartBarIcon, label: "Projects Analytics" },
    { Icon: FileTextIcon, label: "All Projects" },
    { Icon: FunnelIcon, label: "Filtered Results" },
  ],
  "/upload": [
    { Icon: HouseIcon, label: "Home" },
    { Icon: UploadIcon, label: "Data Management" },
  ],
  "/reports": [
    { Icon: PresentationChartIcon, label: "Projects Analytics" },
    { Icon: FileTextIcon, label: "Reports & Pareto" },
  ],
};

function getDynamicBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [
    { Icon: ChartBarIcon, label: "Projects Analytics" },
    { Icon: FileTextIcon, label: "All Projects" },
  ];

  const segments = pathname.replace("/projects/", "").split("/");

  if (segments.length >= 1 && segments[0]) {
    base.push({ Icon: FileTextIcon, label: "RS Tri Harsi" });
  }
  if (segments.length >= 2) {
    base.push({ Icon: TreeStructureIcon, label: "Pekerjaan Struktur" });
  }
  if (segments.length >= 3) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg === "hpp" || lastSeg === "risk") {
      base.push({ Icon: FileTextIcon, label: "HPP & Project Performance" });
    } else {
      base.push({ Icon: BuildingOfficeIcon, label: "Detail Sumber Daya" });
    }
  }
  if (segments.length >= 4) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg !== "hpp" && lastSeg !== "risk") {
      base.push({ Icon: FileTextIcon, label: "Detail Vendor" });
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

            return (
              <div key={index} className="flex items-center gap-2">
                {/* Separator Panah */}
                {index > 0 && <CaretRightIcon size={8} className="text-gray-400" />}

                <div className="flex items-center gap-1.5">
                  {/* Container Icon */}
                  <span className={isLast ? "text-gray-900" : "text-gray-500"}>
                    <Icon size={14} weight={isLast ? "fill" : "regular"} />
                  </span>

                  {/* Label Teks */}
                  <span className={`text-[12px] ${isLast ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

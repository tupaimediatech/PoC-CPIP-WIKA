"use client";

import { usePathname, useSearchParams } from "next/navigation"; // Tambah useSearchParams
import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HouseIcon,
  PresentationChartIcon,
  CaretRightIcon,
  UploadIcon,
  FileTextIcon,
  FunnelIcon, // Tambahkan FunnelIcon
  IconProps,
  TreeStructureIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  SpeedometerIcon,
  MoneyWavyIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import { projectApi, periodApi } from "@/lib/api";

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
  "/projects/cpi/building": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: PresentationChartIcon, label: "Infographic Summary", href: "/" },
    { Icon: SpeedometerIcon, label: "Division Performance Comparison", href: "/projects" }, // Sesuaikan href jika perlu
    { Icon: MoneyWavyIcon, label: "CPI Building" },
  ],
  "/projects/cpi/infrastructure": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: PresentationChartIcon, label: "Infographic Summary", href: "/" },
    { Icon: SpeedometerIcon, label: "Division Performance Comparison", href: "/projects" }, // Sesuaikan href jika perlu
    { Icon: MoneyWavyIcon, label: "CPI Infrastructure" },
  ],
  "/projects/spi/building": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: PresentationChartIcon, label: "Infographic Summary", href: "/" },
    { Icon: SpeedometerIcon, label: "Division Performance Comparison", href: "/projects" }, // Sesuaikan href jika perlu
    { Icon: CalendarBlankIcon, label: "SPI Building" },
  ],
  "/projects/spi/infrastructure": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: PresentationChartIcon, label: "Infographic Summary", href: "/" },
    { Icon: SpeedometerIcon, label: "Division Performance Comparison", href: "/projects" }, // Sesuaikan href jika perlu
    { Icon: CalendarBlankIcon, label: "SPI Infrastructure" },
  ],
  "/upload": [
    { Icon: HouseIcon, label: "Home", href: "/" },
    { Icon: UploadIcon, label: "Data Management" },
  ],
};

function useDynamicBreadcrumbs(pathname: string): BreadcrumbItem[] | null {
  const [items, setItems] = useState<BreadcrumbItem[] | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/projects/")) {
      setItems(null);
      return;
    }

    const segments = pathname.replace("/projects/", "").split("/");
    const projectId = Number(segments[0]);
    const tahapId = segments[1] ? Number(segments[1]) : null;
    const itemId = segments[2] && segments[2] !== "hpp" && segments[2] !== "risk" ? Number(segments[2]) : null;
    const lastSeg = segments[segments.length - 1];

    if (!projectId || isNaN(projectId)) {
      setItems(null);
      return;
    }

    const base: BreadcrumbItem[] = [
      { Icon: ChartBarIcon, label: "Projects Analytics", href: "/" },
      { Icon: FileTextIcon, label: "All Projects", href: "/projects" },
    ];

    const fetches: Promise<void>[] = [];
    let projectName = "...";
    let phaseName = "...";
    let itemName = "...";

    fetches.push(
      projectApi
        .detail(projectId)
        .then((res) => {
          projectName = res.data.project_name || `Project #${projectId}`;
        })
        .catch(() => {
          projectName = `Project #${projectId}`;
        }),
    );

    if (tahapId && !isNaN(tahapId)) {
      fetches.push(
        projectApi
          .periods(projectId)
          .then((res) => {
            const phase = res.data.phases?.find((p: any) => p.id === tahapId);
            phaseName = phase?.name || `Phase #${tahapId}`;
          })
          .catch(() => {
            phaseName = `Phase #${tahapId}`;
          }),
      );
    }

    if (tahapId && !isNaN(tahapId) && itemId && !isNaN(itemId)) {
      fetches.push(
        periodApi
          .workItems(tahapId)
          .then((res) => {
            const item = res.data.items?.find((i: any) => i.id === itemId);
            itemName = item?.name || `Item #${itemId}`;
          })
          .catch(() => {
            itemName = `Item #${itemId}`;
          }),
      );
    }

    Promise.all(fetches).then(() => {
      base.push({
        Icon: FileTextIcon,
        label: projectName,
        href: `/projects/${projectId}`,
      });

      if (tahapId && !isNaN(tahapId)) {
        base.push({
          Icon: TreeStructureIcon,
          label: phaseName,
          href: `/projects/${projectId}/${tahapId}`,
        });
      }

      if (itemId && !isNaN(itemId)) {
        base.push({
          Icon: BuildingOfficeIcon,
          label: itemName,
          href: `/projects/${projectId}/${tahapId}/${itemId}`,
        });
      }

      if (lastSeg === "hpp") {
        base.push({ Icon: FileTextIcon, label: "HPP & CPI Analysis" });
      } else if (lastSeg === "risk") {
        base.push({ Icon: FileTextIcon, label: "Risk & Timeline" });
      }

      setItems(base);
    });
  }, [pathname]);

  return items;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Hook untuk mengambil query dari URL
  const dynamicItems = useDynamicBreadcrumbs(pathname);

  let items: BreadcrumbItem[];
  if (STATIC_BREADCRUMBS[pathname]) {
    items = [...STATIC_BREADCRUMBS[pathname]];
  } else if (pathname.startsWith("/projects/") && dynamicItems) {
    items = [...dynamicItems];
  } else if (pathname.startsWith("/projects/")) {
    items = [
      { Icon: ChartBarIcon, label: "Projects Analytics", href: "/" },
      { Icon: FileTextIcon, label: "All Projects", href: "/projects" },
      { Icon: FileTextIcon, label: "..." },
    ];
  } else {
    items = [...(STATIC_BREADCRUMBS["/"] || [])];
  }

  const owner = searchParams.get("owner");
  const sbu = searchParams.get("sbu");

  if (owner || sbu) {
    const labelParts = [];
    if (owner) labelParts.push(owner);
    if (sbu) labelParts.push(sbu);
    items.push({
      Icon: FunnelIcon,
      label: `Filtered Results (${labelParts.join(", ")})`,
    });
  }

  return (
    <div className="flex items-center bg-white border-b border-[#E9E9EA]" style={{ height: "50px", padding: "0 32px" }}>
      <div className="flex items-center bg-[#F9FAFB] rounded-lg px-4" style={{ height: "34px" }}>
        <div className="flex items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const { Icon } = item;

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

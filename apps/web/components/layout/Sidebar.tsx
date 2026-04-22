"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HouseIcon,
  ChartBarIcon,
  ProjectorScreenChartIcon,
  FilesIcon,
  BellIcon,
  GearSixIcon,
  SignOutIcon,
  CaretDoubleLeftIcon,
  CaretDownIcon,
  DatabaseIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { authApi } from "@/lib/api";
import wika from "@/public/WIka-new.svg";
import { clearToken, getUser } from "@/lib/auth";
import { useState } from "react";

const menuGroups = [
  {
    title: "General",
    items: [
      { href: "/", label: "Home", Icon: HouseIcon },
      { href: "/projects", label: "Projects Analytics", Icon: ChartBarIcon },
      { href: "/reports", label: "Reports and Pareto", Icon: ProjectorScreenChartIcon },
      {
        href: "/data-management",
        label: "Data Management",
        Icon: FilesIcon,
        children: [
          { href: "/data-management/material", label: "Database Material", Icon: DatabaseIcon },
          { href: "/data-management/upload", label: "Data Ingestion", Icon: UploadSimpleIcon },
        ],
      },
    ],
  },
  {
    title: "Others",
    items: [
      { href: "/notifications", label: "Notifications", Icon: BellIcon },
      { href: "/settings", label: "Settings", Icon: GearSixIcon },
      { href: "/logout", label: "Log Out", Icon: SignOutIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle, width } = useSidebar();

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of menuGroups) {
      for (const item of group.items) {
        if ("children" in item && item.children) {
          const anyChildActive = item.children.some((child) => pathname.startsWith(child.href));
          if (anyChildActive) initial[item.href] = true;
        }
      }
    }
    return initial;
  });

  const toggleDropdown = (href: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearToken();
      router.replace("/login");
    }
  };

  return (
    <aside
      className="fixed top-5 left-0 h-screen flex flex-col bg-sidebar border-r border-gray-200 text-dark-gray antialiased transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: `${width}px` }}
    >
      <div
        className={`flex items-center border-b border-[#E9E9EA] shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}
        style={{
          height: "89px",
          paddingTop: "24px",
          paddingRight: "18px",
          paddingBottom: "16px",
          paddingLeft: "18px",
        }}
      >
        {!collapsed && <Image src={wika} alt="WIKA Logo" priority />}

        <button
          onClick={toggle}
          className="hover:bg-gray-200 border border-gray-200 bg-white transition-all flex items-center justify-center shrink-0"
          style={{ width: "20px", height: "20px", borderRadius: "4px" }}
        >
          <CaretDoubleLeftIcon size={16} className={`text-[#1B1C1F] transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="flex-1 px-3 py-6 space-y-7 overflow-y-auto">
        {menuGroups
          .filter((group) => group.title === "General")
          .map((group) => (
            <div key={group.title}>
              {!collapsed && <h3 className="px-4 text-[11px] font-semibold text-gray-400 tracking-wider mb-2">{group.title}</h3>}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const hasChildren = "children" in item && item.children && item.children.length > 0;
                  const isOpen = openDropdowns[item.href] ?? false;

                  // Sama persis dengan kondisi active sidebar lainnya: pathname.startsWith(item.href)
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                  if (hasChildren) {
                    return (
                      <div key={item.href}>
                        <button
                          onClick={() => toggleDropdown(item.href)}
                          title={collapsed ? item.label : undefined}
                          className={`w-full flex items-center rounded-xl transition-all overflow-hidden whitespace-nowrap ${
                            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-4 py-2.5"
                          } ${
                            isActive
                              ? "bg-primary-blue text-white shadow-lg shadow-blue-900/20 font-bold text-[14px] leading-[150%]"
                              : "text-[#1B1C1F] hover:bg-gray-200/60 font-medium text-[14px] leading-[150%]"
                          }`}
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          <span className={`shrink-0 ${isActive ? "text-white" : "text-[#1B1C1F]"}`}>
                            <item.Icon size={20} weight={isActive ? "fill" : "regular"} />
                          </span>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              <CaretDownIcon
                                size={14}
                                className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isActive ? "text-white" : "text-[#1B1C1F]"}`}
                              />
                            </>
                          )}
                        </button>

                        {!collapsed && isOpen && (
                          <div className="mt-1 ml-3 space-y-1 border-l-2 border-gray-200 pl-2">
                            {item.children!.map((child) => {
                              // Sama persis dengan kondisi active sidebar lainnya
                              const isChildActive = pathname.startsWith(child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-nowrap gap-3 px-4 py-2.5 ${
                                    isChildActive
                                      ? "bg-primary-blue text-white shadow-lg shadow-blue-900/20 font-bold text-[14px] leading-[150%]"
                                      : "text-[#1B1C1F] hover:bg-gray-200/60 font-medium text-[14px] leading-[150%]"
                                  }`}
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  <span className={`shrink-0 ${isChildActive ? "text-white" : "text-[#1B1C1F]"}`}>
                                    <child.Icon size={18} weight={isChildActive ? "fill" : "regular"} />
                                  </span>
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-nowrap ${
                        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-4 py-2.5"
                      } ${
                        isActive
                          ? "bg-primary-blue text-white shadow-lg shadow-blue-900/20 font-bold text-[14px] leading-[150%]"
                          : "text-[#1B1C1F] hover:bg-gray-200/60 font-medium text-[14px] leading-[150%]"
                      }`}
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      <span className={`shrink-0 ${isActive ? "text-white" : "text-[#1B1C1F]"}`}>
                        <item.Icon size={20} weight={isActive ? "fill" : "regular"} />
                      </span>
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
      </div>

      <div className="mt-auto flex flex-col justify-between shrink-0" style={{ width: "100%", height: collapsed ? "auto" : "237px" }}>
        <div className={collapsed ? "px-3 pt-2" : "px-4 pt-2"}>
          {!collapsed && <h3 className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">Others</h3>}
          <nav className="space-y-1">
            {menuGroups[1].items.map((item) => {
              const isActive = pathname === item.href;

              if (item.label === "Log Out") {
                return (
                  <button
                    key={item.label}
                    onClick={handleLogout}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-lg text-sm font-medium transition-all overflow-hidden whitespace-nowrap ${
                      collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
                    } text-[#1B1C1F] hover:bg-red-50 hover:text-red-600`}
                  >
                    <span className="shrink-0">
                      <item.Icon size={18} weight="regular" />
                    </span>
                    {!collapsed && item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center rounded-lg text-sm font-medium transition-all overflow-hidden whitespace-nowrap ${
                    collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
                  } ${isActive ? "bg-primary-blue text-white" : "text-[#1B1C1F] hover:bg-gray-100"}`}
                >
                  <span className={`shrink-0 ${isActive ? "text-white" : "text-[#1B1C1F]"}`}>
                    <item.Icon size={18} weight={isActive ? "fill" : "regular"} />
                  </span>
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={`flex items-center border-t border-[#E9E9EA] group cursor-pointer bg-sidebar w-full shrink-0 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
          style={{
            height: "76px",
            paddingTop: "16px",
            paddingRight: collapsed ? "0" : "18px",
            paddingBottom: "24px",
            paddingLeft: collapsed ? "0" : "18px",
            boxSizing: "border-box",
          }}
        >
          <div className={`flex items-center overflow-hidden ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className="w-9 h-9 rounded-full bg-primary-blue shrink-0 border border-gray-200 shadow-sm"></div>
            {!collapsed && (
              <div className="overflow-hidden text-left">
                <p className="text-[13px] font-bold text-dark-gray truncate leading-tight">{getUser()?.name ?? "—"}</p>
                <p className="text-[11px] text-gray-500 truncate">{getUser()?.email ?? "—"}</p>
              </div>
            )}
          </div>
          {!collapsed && <CaretDownIcon size={18} className="text-[#1B1C1F] bg-white shrink-0" />}
        </div>
      </div>
    </aside>
  );
}

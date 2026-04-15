"use client";

import { CaretDown } from "@phosphor-icons/react";
import { getUser } from "@/lib/auth";

export default function DynamicHeader() {
  return (
    <header
      className="flex items-center justify-between border-b border-[#E9E9EA] bg-white sticky top-0 z-10"
      style={{ height: "89px", padding: "0 32px" }}
    >
      <h1 className="text-[#1B1C1F] font-bold text-[20px] leading-tight">
        Projects Performance Analytics Dashboard
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-[14px] font-medium text-[#1B1C1F]">
          {getUser()?.name ?? "—"}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] bg-primary-blue rounded-full shrink-0"></div>
          <CaretDown size={12} className="text-[#1B1C1F]" />
        </div>
      </div>
    </header>
  );
}

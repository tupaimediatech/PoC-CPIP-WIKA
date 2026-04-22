"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { ReactNode } from "react";

interface InfoPillData {
  label: string;
  value: string;
}

interface PageHeaderProps {
  title: string;
  pills?: InfoPillData[];
  onExport?: () => void;
  children?: ReactNode;
}

export default function PageHeader({ title, pills, onExport, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[20px] font-bold text-[#1B1C1F]">{title}</h1>
        {pills && pills.length > 0 && (
          <div className="flex items-center gap-2">
            {pills.map((pill, i) => (
              <div key={i} className="flex items-center">
                <span className="text-[13px] text-gray-500">{pill.label} :</span>
                <span className="text-[13px] font-bold text-[#1B1C1F] ml-1">{pill.value}</span>
                {i < pills.length - 1 && <div className="w-px h-4 bg-gray-300 mx-3" />}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-4 hover:brightness-110 transition-all"
            style={{ height: "38px" }}
          >
            Export Data
            <DownloadSimpleIcon size={16} weight="bold" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

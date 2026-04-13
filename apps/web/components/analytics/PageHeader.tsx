"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";

interface InfoPillData {
  label: string;
  value: string;
}

interface PageHeaderProps {
  title: string;
  pills?: InfoPillData[];
  onExport?: () => void;
}

export default function PageHeader({
  title,
  pills,
  onExport,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4 w-full">
      {/* Container Kiri: Hanya Title */}
      <div className="flex-1">
        <h1 className="text-[20px] font-bold text-[#1B1C1F] whitespace-nowrap truncate ">
          {title.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())}
        </h1>
      </div>

      {/* Container Kanan: Pills dan Button Export didorong ke kanan (justify-end) */}
      <div className="flex items-center justify-end gap-6 shrink-0">
        {/* Kelompok Pills (Justify End) */}
        {pills && pills.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            {pills.map((pill, i) => (
              <div key={i} className="flex items-center">
                <span className="text-[13px] text-gray-500">
                  {pill.label
                    .toLowerCase()
                    .replace(/\b\w/g, (s) => s.toUpperCase())}{" "}
                  :
                </span>
                <span className="text-[13px] font-bold text-[#1B1C1F] ml-1 whitespace-nowrap">
                  {pill.value}
                </span>
                {i < pills.length - 1 && (
                  <div className="w-px h-4 bg-gray-300 mx-3" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tombol Export */}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-4 hover:brightness-110 transition-all shrink-0"
            style={{ height: "38px" }}
          >
            Export Data
            <DownloadSimpleIcon size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}

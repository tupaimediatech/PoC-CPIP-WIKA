"use client";

import { DownloadSimpleIcon, CircleNotch } from "@phosphor-icons/react";
import { ReactNode, useState } from "react";

interface InfoPillData {
  label: string;
  value: string;
}

interface PageHeaderProps {
  title: string;
  pills?: InfoPillData[];
  onExport?: () => Promise<void>; // Pastikan tipe data menerima Promise
  children?: ReactNode;
}

export default function PageHeader({ title, pills, onExport, children }: PageHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async () => {
    if (!onExport) return;

    setIsExporting(true);
    try {
      // Ini akan menunggu proses exportElementToPdf di parent selesai
      await onExport();
    } finally {
      // Setelah proses selesai (atau jika error), kembalikan tombol ke kondisi awal
      setIsExporting(false);
    }
  };

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
            onClick={handleExportClick}
            disabled={isExporting} // Mencegah klik ganda saat proses
            className={`flex items-center gap-2 text-white text-[13px] font-bold rounded-lg px-4 transition-all ${
              isExporting ? "bg-gray-400 cursor-not-allowed" : "bg-primary-blue hover:brightness-110"
            }`}
            style={{ height: "38px" }}
          >
            {isExporting ? (
              <>
                Processing...
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              </>
            ) : (
              <>
                Export Data
                <DownloadSimpleIcon size={16} weight="bold" />
              </>
            )}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

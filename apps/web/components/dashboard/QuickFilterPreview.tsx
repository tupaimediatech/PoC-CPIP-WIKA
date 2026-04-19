"use client";

import { useState, useEffect } from "react";
import { CaretDownIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { projectApi } from "@/lib/api";
import type { FilterOptionsResponse } from "@/types/project";
import * as XLSX from "xlsx";

type FilterState = {
  sbu: string;
  owner: string;
  contract: string;
  partnership: string;
};

const EMPTY_FILTERS: FilterState = { sbu: "", owner: "", contract: "", partnership: "" };

interface QuickFilterPreviewProps {
  onSearch: (filters: FilterState) => void;
  onReset: () => void;
  onExport?: () => void;
}

export default function QuickFilterPreview({ onSearch, onReset, onExport }: QuickFilterPreviewProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [options, setOptions] = useState<FilterOptionsResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    projectApi.filterOptions().then(setOptions).catch(console.error);
  }, []);

  const updateFilter = (key: keyof FilterState, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  // --- FUNGSI EXPORT ---
  const handleExport = async () => {
    try {
      setIsExporting(true);
      // 1. Ambil data dari API berdasarkan filter saat ini
      const response = await projectApi.exportDashboard(filters);
      const rawData = response.projects.data;

      // 2. Mapping data agar header Excel rapi
      const exportData = rawData.map((item: any) => ({
        "Project Code": item.project_code,
        "Project Name": item.project_name,
        Division: item.division,
        Owner: item.owner,
        "Contract Value": parseFloat(item.contract_value),
        "Actual Cost": parseFloat(item.actual_cost),
        "Progress (%)": item.progress_pct,
        CPI: item.cpi,
        SPI: item.spi,
        Status: item.status,
      }));

      // 3. Proses menjadi file Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");

      // 4. Download file
      XLSX.writeFile(workbook, `Dashboard_Export_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    router.push(window.location.pathname);
    onReset();
  };
  const handleSearch = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`?${params.toString()}`);
    onSearch(filters);
  };

  const filterDefs: { key: keyof FilterState; label: string; optionKey: keyof FilterOptionsResponse }[] = [
    { key: "sbu", label: "SBU", optionKey: "sbu" },
    { key: "owner", label: "Owner", optionKey: "owner" },
    { key: "contract", label: "Contract", optionKey: "contract_type" },
    { key: "partnership", label: "Partnership", optionKey: "partnership" },
  ];

  return (
    <div className="bg-white w-full" style={{ padding: "18px 32px" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">Quick Filter Preview</h2>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-4 hover:brightness-110 transition-all ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ height: "38px" }}
        >
          {isExporting ? "Processing..." : "Export Data"}
          <DownloadSimpleIcon size={16} weight="bold" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {filterDefs.map(({ key, label, optionKey }) => (
          <FilterPill
            key={key}
            label={label}
            value={filters[key]}
            placeholder={`Select ${label}`}
            options={(options?.[optionKey] as string[]) ?? []}
            onChange={(v) => updateFilter(key, v)}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSearch}
          className="flex items-center justify-center bg-primary-blue text-white text-[13px] font-bold rounded-lg hover:brightness-110 transition-all"
          style={{ width: "93px", height: "31px" }}
        >
          Search
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center border border-gray-300 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors"
          style={{ width: "93px", height: "31px" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex items-center bg-white border border-gray-200 rounded-md cursor-pointer" style={{ height: "27px" }}>
      <div className="flex items-center gap-1 px-2">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className="text-[12px] text-gray-400">:</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-[#1B1C1F] pr-6 pl-0 focus:outline-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <CaretDownIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

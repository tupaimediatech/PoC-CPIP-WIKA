"use client";

import { useState } from "react";
import { CaretDownIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { DashboardFilterOptions } from "@/types/dashboard";
import type { ActiveFilters } from "@/components/dashboard/DashboardSummary";

type FilterState = {
  sbu: string;
  owner: string;
  contract: string;
  partnership: string;
  division: string;
  year: string;
  location: string;
  funding_source: string;
};

const EMPTY_FILTERS: FilterState = {
  sbu: "",
  owner: "",
  contract: "",
  partnership: "",
  division: "",
  year: "",
  location: "",
  funding_source: "",
};

interface QuickFilterPreviewProps {
  filterOptions: DashboardFilterOptions; // ← dari parent (dashboardApi), bukan fetch sendiri
  onSearch: (filters: ActiveFilters) => void;
  onReset: () => void;
  onExport?: () => void;
}

export default function QuickFilterPreview({ filterOptions, onSearch, onReset, onExport }: QuickFilterPreviewProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const updateFilter = (key: keyof FilterState, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  // --- EXPORT AS PDF: screenshot seluruh halaman dashboard ---
  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Dynamically import agar tidak membebani bundle
      const { exportDashboardToPdf } = await import("@/lib/exportPdf");
      await exportDashboardToPdf("dashboard-export-root");
    } catch (error) {
      console.error("Export PDF error:", error);
      alert("Gagal mengekspor PDF. Silakan coba lagi.");
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
    onSearch({
      sbu: filters.sbu,
      owner: filters.owner,
      contract_type: filters.contract,
      partnership: filters.partnership,
      division: filters.division,
      year: filters.year,
      location: filters.location,
      funding_source: filters.funding_source,
      contractRange: "",
    });
  };

  const filterDefs: { key: keyof FilterState; label: string; options: string[] }[] = [
    { key: "sbu", label: "SBU", options: filterOptions.sbu ?? [] },
    { key: "owner", label: "Owner", options: filterOptions.owner ?? [] },
    { key: "contract", label: "Contract", options: filterOptions.contract_type ?? [] },
    { key: "partnership", label: "Partnership", options: filterOptions.partnership ?? [] },
  ];

  return (
    // data-pdf-ignore="true" agar filter bar tidak ikut tereksport di PDF
    <div className="bg-white w-full" style={{ padding: "18px 32px" }} data-pdf-ignore="true">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">Quick Filter Preview</h2>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-4 hover:brightness-110 transition-all ${
            isExporting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{ height: "38px" }}
        >
          {isExporting ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              Export PDF
              <DownloadSimpleIcon size={16} weight="bold" />
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {filterDefs.map(({ key, label, options }) => (
          <FilterPill
            key={key}
            label={label}
            value={filters[key]}
            placeholder={`Select ${label}`}
            options={options}
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
    <div className="relative flex items-center bg-white border border-gray-200 rounded-md cursor-pointer" style={{ height: "27px", width: "200px" }}>
      <div className="flex items-center gap-1 px-2 flex-shrink-0">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className="text-[12px] text-gray-400">:</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-[#1B1C1F] pr-6 pl-1 focus:outline-none cursor-pointer flex-1 min-w-0 truncate"
        title={value || placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <CaretDownIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex-shrink-0" />
    </div>
  );
}

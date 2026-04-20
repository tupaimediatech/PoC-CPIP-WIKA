"use client";

import {
  type Icon as PhosphorIcon,
  ProjectorScreenIcon,
  StackOverflowLogoIcon,
  MoneyWavyIcon,
  CalendarBlankIcon,
  InfoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { formatKpi } from "@/lib/utils";
import type { SummaryResponse, DashboardFilters } from "@/types/project";

const DIVISIONS = [
  { v: "", l: "All" },
  { v: "Infrastructure", l: "Infrastructure" },
  { v: "Building", l: "Building" },
];
const CONTRACTS = [
  { v: "", l: "All" },
  { v: "0-500", l: "< 500 M" },
  { v: "500-999", l: "≥ 500 M" },
];
const YEARS = [
  { v: "", l: "Year" },
  { v: "2024", l: "2024" },
  { v: "2025", l: "2025" },
  { v: "2026", l: "2026" },
];

type Props = {
  data: SummaryResponse;
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
};

export default function KpiCards({ data, filters, onChange }: Props) {
  const updateFilter = (key: keyof DashboardFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col bg-white w-full" style={{ padding: "18px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">Overview</h2>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center"
            style={{
              height: "27px",
              gap: "16px",
            }}
          >
            <FilterSelect label="Division" value={filters.division} options={DIVISIONS} onChange={(v) => updateFilter("division", v)} />
            <FilterSelect
              label="Contract Value"
              value={filters.contractRange}
              options={CONTRACTS}
              onChange={(v) => updateFilter("contractRange", v)}
            />
            <FilterSelect label="Year" value={filters.year} options={YEARS} onChange={(v) => updateFilter("year", v)} />
          </div>

          {(filters.division || filters.contractRange || filters.year) && (
            <button
              onClick={() => onChange({ division: "", contractRange: "", year: "" })}
              className="text-[11px] text-blue-600 font-bold hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Projects" value={data.total_projects || "—"} icon={ProjectorScreenIcon} />
        <KpiCard label="Average Unit Rate" value="—" icon={StackOverflowLogoIcon} />
        <KpiCard label="Average CPI" value={data.total_projects > 0 ? formatKpi(data.avg_cpi) : "—"} icon={MoneyWavyIcon} />
        <KpiCard label="Average SPI" value={data.total_projects > 0 ? formatKpi(data.avg_spi) : "—"} icon={CalendarBlankIcon} />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex items-center bg-white border border-gray-200 rounded-md px-2" style={{ height: "27px" }}>
      <div className="flex items-center gap-0.5">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className="text-[12px] text-gray-400">:</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-[#1B1C1F] pr-6 pl-1 focus:outline-none cursor-pointer h-full"
      >
        {options.map((opt) => (
          <option key={opt.v} value={opt.v}>
            {opt.l}
          </option>
        ))}
      </select>
      <CaretDownIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: PhosphorIcon }) {
  return (
    <div
      className="flex flex-col bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
      style={{ height: "147px" }}
    >
      <div className="flex items-center justify-between mb-2" style={{ height: "26px" }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-primary-blue rounded-md" style={{ width: "26px", height: "26px" }}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[#1B1C1F]">{label}</span>
        </div>
        <InfoIcon size={14} weight="regular" className="text-[#1B1C1F] cursor-help shrink-0" />
      </div>
      <div className="mt-1">
        <h2 className="text-[32px] font-bold text-[#1B1C1F] leading-tight">{value}</h2>
      </div>
    </div>
  );
}

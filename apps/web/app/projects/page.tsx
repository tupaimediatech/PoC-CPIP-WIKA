"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { projectApi } from "@/lib/api";
import type { Project, FilterOptionsResponse } from "@/types/project";
import { formatCurrency, formatKpi, kpiColor } from "@/lib/utils";

const AutocompleteInput = ({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  options: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = isTyping && value ? options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase())) : options;

  const handleFocus = () => {
    setIsTyping(false);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsTyping(true);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsTyping(false);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const item = listRef.current.children[index] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() =>
          setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(-1);
          }, 200)
        }
        onKeyDown={handleKeyDown}
        className="w-full bg-white border border-[#E0E2E7] rounded-lg text-[14px] text-[#1B1C1F] px-4 h-[37px] focus:outline-none focus:border-blue-500 placeholder:text-[#98A2B3] transition-all"
      />

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-[999] w-full mt-1 bg-white border border-[#E0E2E7] rounded-lg shadow-xl max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in duration-75"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-4 py-2 text-[14px] text-[#1B1C1F] cursor-pointer transition-colors font-medium ${
                  idx === activeIndex ? "bg-[#EBF0FF] text-[#21409A]" : "hover:bg-[#F2F4F7]"
                }`}
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-[12px] text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
};

const FILTER_GRID: {
  key: keyof Project;
  label: string;
  optionKey?: keyof FilterOptionsResponse;
  placeholder?: string;
}[] = [
  { key: "project_name", label: "Project Name", placeholder: "e.g. Gedung RS" },
  { key: "contract_type", label: "Contract Pricing Type", optionKey: "contract_type", placeholder: "Type Contract Pricing" },
  { key: "consultant_name", label: "Project Consultant", placeholder: "e.g. PT Virama Karya..." },
  { key: "division", label: "Profit Center / Division", optionKey: "division", placeholder: "Type Division" },
  { key: "sbu", label: "SBU Project", optionKey: "sbu", placeholder: "Type SBU Project" },
  { key: "location", label: "Location", placeholder: "e.g. Surabaya, Jawa Timur" },
  { key: "owner", label: "Project Owner", optionKey: "owner", placeholder: "Type Project Owner" },
  { key: "payment_method", label: "Payment Method", optionKey: "payment_method", placeholder: "Type Payment Method" },
  { key: "partnership", label: "Partnership Type", optionKey: "partnership", placeholder: "Type Partnership" },
  { key: "funding_source", label: "Funding Source", optionKey: "funding_source", placeholder: "Type Funding Source" },
  { key: "planned_duration", label: "Project Duration (Months)", placeholder: "e.g. 24" },
  { key: "partner_name", label: "Partnership Name", placeholder: "Enter Partnership Name" },
  { key: "type_of_contract", label: "Contract Method", optionKey: "type_of_contract" as any, placeholder: "Type Contract Method" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [searchApplied, setSearchApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([projectApi.list(), projectApi.filterOptions()])
      .then(([res, options]) => {
        setAllProjects(res.data);
        setFilterOptions(options);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    setLoading(true);

    const filtered = allProjects.filter((project) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;

        const projectValue = project[key as keyof Project];
        if (projectValue === null || projectValue === undefined) return false;

        return String(projectValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });

    setProjects(filtered);
    setSearchApplied(true);
    setSnackbar(true);
    setLoading(false);
  };

  const handleReset = useCallback(() => {
    setFilters({});
    setSearchApplied(false);
    setProjects([]);
  }, []);

  const handleSnackbarClose = useCallback(() => setSnackbar(false), []);

  // --- FUNGSI CERDAS: Menarik data dari API Filter atau dari Tabel ---
  const getSuggestionsForField = (key: keyof Project, optionKey?: keyof FilterOptionsResponse): string[] => {
    // 1. Coba cari di API Filter Options (untuk dropdown standar seperti division, sbu, owner)
    if (optionKey && filterOptions && filterOptions[optionKey]) {
      const options = filterOptions[optionKey];
      if (Array.isArray(options)) {
        return options.filter((opt) => opt !== null && String(opt).trim() !== "").map(String);
      }
    }

    // 2. Jika bukan dari API (misal nama proyek, lokasi, konsultan), ambil data unik dari data tabel
    if (allProjects.length > 0) {
      const uniqueValues = new Set(allProjects.map((p) => String(p[key] || "")).filter((val) => val.trim() !== ""));
      return Array.from(uniqueValues);
    }

    return [];
  };
  // -------------------------------------------------------------------

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader title="Projects Filter" onExport={() => {}} />

      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6">
        {FILTER_GRID.map(({ key, label, optionKey, placeholder }) => (
          <div key={key}>
            <label className="text-[14px] font-semibold text-[#1B1C1F] mb-2 block">{label}</label>

            {/* SELURUH FILTER SEKARANG MENGGUNAKAN AUTOCOMPLETE */}
            <AutocompleteInput
              value={filters[key as string] ?? ""}
              onChange={(val) => setFilters((prev) => ({ ...prev, [key as string]: val }))}
              placeholder={placeholder}
              options={getSuggestionsForField(key, optionKey)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mb-10">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-primary-blue text-white text-[14px] font-bold px-8 h-[40px] rounded-lg hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          onClick={handleReset}
          className="bg-[#E9E9E9] text-[#1B1C1F] text-[14px] font-bold px-8 h-[40px] rounded-lg hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      <h2 className="text-[20px] font-bold text-[#1B1C1F] mb-6">Project Results</h2>

      {!searchApplied ? (
        <div className="py-16 text-center text-gray-400 text-[14px]">
          {loading ? "Fetching data..." : "Apply filters and click Search to view projects"}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-[14px]">No projects found</div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Profit Center</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nilai Kontrak</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">HPP</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Gross Profit</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">SPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">CPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project, idx) => (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{project.project_code}</td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{project.project_name}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-600">{formatCurrency(project.contract_value)}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-600">{project.hpp || "-"}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700">{project.gross_profit_pct ? `${project.gross_profit_pct}%` : "-"}</td>
                  <td className={`px-4 py-4 text-[14px] font-bold ${kpiColor(String(project.spi))}`}>
                    {project.spi ? Number(project.spi).toFixed(2) : "-"}
                  </td>
                  <td className={`px-4 py-4 text-[14px] font-bold ${kpiColor(String(project.cpi))}`}>
                    {project.cpi ? Number(project.cpi).toFixed(2) : "-"}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex items-center gap-1 text-[#21409A] text-[13px] font-medium hover:underline"
                    >
                      Details <ArrowSquareOutIcon size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Snackbar title="Success!" message={`Filters applied. Showing ${projects.length} projects`} visible={snackbar} onClose={handleSnackbarClose} />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlankIcon, CaretDownIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { projectApi } from "@/lib/api";
import type { Project, FilterOptionsResponse } from "@/types/project";
import { formatKpi, kpiColor } from "@/lib/utils";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

// Mapping key disesuaikan dengan struktur data API yang Anda berikan
const FILTER_GRID: {
  key: keyof Project;
  label: string;
  optionKey?: keyof FilterOptionsResponse;
  type: "select" | "text";
  placeholder?: string;
}[] = [
  { key: "project_name", label: "Project Name", type: "text", placeholder: "Gedung RS" },
  { key: "contract_type", label: "Contract Pricing Type", type: "select", optionKey: "contract_type" },
  { key: "consultant_name", label: "Project Consultant", type: "text", placeholder: "PT Virama Karya..." },
  { key: "division", label: "Profit Center / Division", type: "select", optionKey: "division" },
  { key: "sbu", label: "SBU Project", type: "select", optionKey: "sbu" },
  { key: "location", label: "Location", type: "text", placeholder: "Surabaya, Jawa Timur" },
  { key: "owner", label: "Project Owner", type: "select", optionKey: "owner" },
  { key: "payment_method", label: "Payment Method", type: "select", optionKey: "payment_method" },
  { key: "partnership", label: "Partnership Type", type: "select", optionKey: "partnership" },
  { key: "funding_source", label: "Funding Source", type: "select", optionKey: "funding_source" },
  { key: "planned_duration", label: "Project Duration (Months)", type: "text", placeholder: "24" },
  { key: "partner_name", label: "Partnership Name", type: "text", placeholder: "Enter Partnership Name" },
  { key: "type_of_contract", label: "Contract Method", type: "select", optionKey: "type_of_contract" as any },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // States untuk data
  const [allProjects, setAllProjects] = useState<Project[]>([]); // Data asli dari API
  const [projects, setProjects] = useState<Project[]>([]); // Data hasil filter

  const [searchApplied, setSearchApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  // Load Initial Data (API)
  useEffect(() => {
    setLoading(true);
    if (DEMO_MODE) {
      const data = mockData.projects as unknown as Project[];
      setAllProjects(data);
      setFilterOptions(mockData.filterOptions as unknown as FilterOptionsResponse);
      setLoading(false);
    } else {
      Promise.all([
        projectApi.list(), // Ambil semua data tanpa params agar bisa difilter di FE
        projectApi.filterOptions(),
      ])
        .then(([res, options]) => {
          setAllProjects(res.data);
          setFilterOptions(options);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSearch = () => {
    setLoading(true);

    // Logika Filter Frontend
    const filtered = allProjects.filter((project) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true; // Skip jika filter kosong

        const projectValue = project[key as keyof Project];

        if (projectValue === null || projectValue === undefined) return false;

        // Case-insensitive search untuk text, exact match untuk select
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

  const getOptions = (optionKey?: keyof FilterOptionsResponse): string[] => {
    if (!optionKey || !filterOptions) return [];
    const options = filterOptions[optionKey];
    if (!Array.isArray(options)) return [];
    return options.filter((opt) => opt !== null).map(String);
  };

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader title="Projects Filter" onExport={() => {}} />

      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6">
        {FILTER_GRID.map(({ key, label, optionKey, type, placeholder }) => (
          <div key={key}>
            <label className="text-[14px] font-semibold text-[#1B1C1F] mb-2 block">{label}</label>

            <div className="relative">
              {type === "select" ? (
                <>
                  <select
                    value={filters[key as string] ?? ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, [key as string]: e.target.value }))}
                    className="w-full appearance-none bg-white border border-[#E0E2E7] rounded-lg text-[14px] text-[#1B1C1F] px-4 h-[37px] focus:outline-none focus:border-blue-500 transition-colors pr-10"
                  >
                    <option value="">Select {label}</option>
                    {getOptions(optionKey).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <CaretDownIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none" />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={placeholder}
                  value={filters[key as string] ?? ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key as string]: e.target.value }))}
                  className="w-full bg-white border border-[#E0E2E7] rounded-lg text-[14px] text-[#1B1C1F] px-4 h-[37px] focus:outline-none focus:border-blue-500 placeholder:text-[#98A2B3]"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mb-10">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-[#21409A] text-white text-[14px] font-bold px-8 h-[40px] rounded-lg hover:bg-blue-800 transition-all disabled:opacity-60"
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
                <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Unit Rate (m²/km)</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Gross Profit</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">SPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">CPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project, idx) => (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{project.project_name}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-600">
                    {project.contract_value ? `Rp${Number(project.contract_value).toLocaleString("id-ID")}` : "-"}
                  </td>
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

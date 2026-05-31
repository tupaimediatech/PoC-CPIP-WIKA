"use client";

import { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/analytics/PageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { formatCurrency, formatKpi, kpiColor } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/exporter";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = searchQuery ? options.filter((opt) => opt.toLowerCase().includes(searchQuery.toLowerCase())) : options;

  const handleFocus = () => {
    setSearchQuery("");
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearchQuery("");
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
      setSearchQuery("");
      setActiveIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSearchQuery("");
      setActiveIndex(-1);
    }, 200);
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const item = listRef.current.children[index] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  };

  const displayValue = isOpen ? searchQuery : value;

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
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

const LEVELS = [
  { id: 3, name: "Level 3 - Profit & Loss Summary" },
  { id: 4, name: "Level 4 - WBS Overview" },
  { id: 5, name: "Level 5 - Harsat per Sumber Daya" },
  { id: 6, name: "Level 6 - Monitoring Kontrak Vendor" },
  { id: 7, name: "Level 7 - Risk Register & Timeline" },
];

export default function CustomReportPage() {
  const [filters, setFilters] = useState<Record<string, string>>({
    level: "Level 5 - Harsat per Sumber Daya",
  });
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [searchApplied, setSearchApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [activeLevel, setActiveLevel] = useState<number>(5);

  // Filter Data from API
  const [projectFilterOptions, setProjectFilterOptions] = useState<any>(null);
  const [resourceFilterOptions, setResourceFilterOptions] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<{key: string, label: string}[]>([]);

  useEffect(() => {
    import("@/lib/api").then(({ projectApi, resourceApi }) => {
      Promise.all([projectApi.list(), projectApi.filterOptions(), resourceApi.filterOptions()])
        .then(([projectsRes, projOpts, resOpts]) => {
          setAllProjects(projectsRes.data);
          setProjectFilterOptions(projOpts);
          setResourceFilterOptions(resOpts);
        })
        .catch(console.error);
    });
  }, []);

  const getSuggestions = (type: string): string[] => {
    if (type === "level") return LEVELS.map((l) => l.name);
    
    if (type === "project_name") {
      if (allProjects.length > 0) {
        return Array.from(new Set(allProjects.map((p) => String(p.project_name || "")).filter((v) => v.trim() !== "")));
      }
      if (resourceFilterOptions?.project_name) return resourceFilterOptions.project_name;
      return [];
    }

    if (type === "vendor") {
      // Vendor usually from Level 6 monitoring, we don't have a direct list in these APIs.
      return ["Vendor X", "Vendor Y"]; 
    }

    if (type === "year_from" || type === "year_to") {
      let years: string[] = [];
      if (projectFilterOptions?.year) years = [...years, ...projectFilterOptions.year.map(String)];
      if (resourceFilterOptions?.year) years = [...years, ...resourceFilterOptions.year.map(String)];
      
      const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(a) - Number(b));
      
      if (type === "year_to" && filters.year_from) {
        return uniqueYears.filter((y) => Number(y) >= Number(filters.year_from));
      }
      return uniqueYears;
    }

    if (type === "location") {
      if (projectFilterOptions?.location) return projectFilterOptions.location;
      return [];
    }

    if (type === "sbu") {
      if (projectFilterOptions?.sbu) return projectFilterOptions.sbu;
      return [];
    }

    if (type === "contract_type") {
      if (projectFilterOptions?.contract_type) return projectFilterOptions.contract_type;
      return [];
    }

    return [];
  };

  const FILTER_GRID = [
    { key: "level", label: "Report Level", placeholder: "Select Report Level" },
    { key: "project_name", label: "Project Name", placeholder: "Input Project Name" },
    { key: "vendor", label: "Vendor", placeholder: "Input Vendor Name" },
    { key: "year_from", label: "Year From", placeholder: "e.g 2022" },
    { key: "year_to", label: "Year To", placeholder: "e.g 2023" },
    { key: "location", label: "Location", placeholder: "Input Location" },
    { key: "sbu", label: "SBU Project", placeholder: "Select SBU Project" },
    { key: "contract_type", label: "Contract Type", placeholder: "Select Contract Type" },
  ];

  const handleSearch = () => {
    setLoading(true);
    
    // Determine selected level
    const levelObj = LEVELS.find(l => l.name === filters["level"]);
    const level = levelObj ? levelObj.id : 3;
    setActiveLevel(level);

    setTimeout(() => {
      let mockData: any[] = [];
      let mockColumns: { key: string; label: string }[] = [];

      if (level === 3) {
        mockColumns = [
          { key: 'project_name', label: 'Project Name' },
          { key: 'scope_of_work', label: 'Lingkup' },
          { key: 'contract_value', label: 'Nilai Kontrak' },
          { key: 'hpp_pct', label: 'HPP (%)' },
          { key: 'gross_profit_pct', label: 'Gross Profit (%)' },
          { key: 'spi', label: 'SPI' },
          { key: 'cpi', label: 'CPI' },
          { key: 'status', label: 'Status' },
        ];
        mockData = [
          { id: 1, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", contract_value: 5000000000, hpp_pct: 80, gross_profit_pct: 20, spi: 1.05, cpi: 1.02, status: "On Time On Budget" }
        ];
      } else if (level === 4) {
        mockColumns = [
          { key: 'project_name', label: 'Project Name' },
          { key: 'scope_of_work', label: 'Lingkup' },
          { key: 'phase', label: 'Tahap Pekerjaan' },
          { key: 'bq_external', label: 'BQ External' },
          { key: 'actual_costs', label: 'Realisasi Biaya' },
          { key: 'deviasi_pct', label: 'Deviasi (%)' },
        ];
        mockData = [
          { id: 1, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", phase: "Pekerjaan Persiapan", bq_external: 150000000, actual_costs: 140000000, deviasi_pct: 6.67 }
        ];
      } else if (level === 5) {
        mockColumns = [
          { key: 'project_name', label: 'Project Name' },
          { key: 'scope_of_work', label: 'Lingkup' },
          { key: 'id_resource', label: 'ID Resource' },
          { key: 'resource_name', label: 'Item Sumber Daya' },
          { key: 'category', label: 'Kategori' },
          { key: 'volume', label: 'Volume' },
          { key: 'unit', label: 'Satuan' },
          { key: 'harsat', label: 'Harsat Internal' },
          { key: 'total', label: 'Total Biaya' },
        ];
        mockData = [
          { id: 1, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", id_resource: "RSC-001", resource_name: "Semen Portland", category: "Material", volume: 1000, unit: "Zak", harsat: 65000, total: 65000000 },
          { id: 2, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", id_resource: "RSC-002", resource_name: "Besi Beton", category: "Material", volume: 5000, unit: "Kg", harsat: 12000, total: 60000000 }
        ];
      } else if (level === 6) {
        mockColumns = [
          { key: 'project_name', label: 'Project Name' },
          { key: 'scope_of_work', label: 'Lingkup' },
          { key: 'resource', label: 'Item Sumber Daya' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'contract_value', label: 'Nilai Kontrak Vendor' },
          { key: 'harsat_internal', label: 'Harsat Internal' },
          { key: 'progress', label: 'Progress (%)' },
        ];
        mockData = [
          { id: 1, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", resource: "Semen Portland", vendor: "Vendor X", contract_value: 100000000, harsat_internal: 65000, progress: 50 }
        ];
      } else if (level === 7) {
        mockColumns = [
          { key: 'project_name', label: 'Project Name' },
          { key: 'scope_of_work', label: 'Lingkup' },
          { key: 'category', label: 'Kategori Risiko' },
          { key: 'title', label: 'Deskripsi Kejadian' },
          { key: 'impact', label: 'Dampak Finansial' },
          { key: 'status', label: 'Status' },
        ];
        mockData = [
          { id: 1, project_name: "Project Alpha", scope_of_work: "Pembangunan Jalan Tol Seksi 1", category: "cost", title: "Kenaikan harga material baja", impact: 10000000, status: "open" }
        ];
      }
      
      setTableColumns(mockColumns);
      setReportData(mockData);
      setSearchApplied(true);
      setSnackbar(true);
      setLoading(false);
    }, 1000);
  };

  const handleReset = () => {
    setFilters({ level: "Level 5 - Harsat per Sumber Daya" });
    setSearchApplied(false);
    setReportData([]);
    setTableColumns([]);
  };

  const handleSnackbarClose = () => setSnackbar(false);

  const renderCellValue = (key: string, value: any) => {
    if (value === null || value === undefined) return "-";
    
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('pct') || lowerKey.includes('progress') || lowerKey.includes('deviasi')) {
      return `${value}%`;
    }
    
    if (lowerKey.includes('value') || lowerKey.includes('cost') || lowerKey.includes('hpp') || lowerKey.includes('biaya') || lowerKey.includes('harsat') || lowerKey.includes('impact') || lowerKey === 'bq_external' || lowerKey === 'realisasi') {
       if (!isNaN(value)) {
         return formatCurrency(value);
       }
    }

    if (lowerKey === 'spi' || lowerKey === 'cpi') {
      return <span className={`font-bold ${kpiColor(value)}`}>{formatKpi(value)}</span>;
    }
    
    if (lowerKey.includes('status')) {
      const statusClasses: Record<string, string> = {
        "On Time On Budget": "bg-green-50 text-green-700 border-green-200",
        "On Time Overbudget": "bg-orange-50 text-orange-700 border-orange-200",
        "Delay On Budget": "bg-yellow-50 text-yellow-700 border-yellow-200",
        "Delay Overbudget": "bg-red-50 text-red-700 border-red-200",
        "open": "bg-red-50 text-red-700 border-red-200",
        "closed": "bg-green-50 text-green-700 border-green-200",
      };
      const cls = statusClasses[value] || "bg-gray-50 text-gray-600 border-gray-200";
      return <span className={`px-3 py-1.5 border rounded-full text-[12px] font-medium whitespace-nowrap inline-block capitalize ${cls}`}>{value}</span>;
    }

    return value;
  };

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title="Custom Report"
        onExport={async () => {
          await exportElementToPdf("custom-report-export", {
            filename: `Custom_Report_Level_${activeLevel}`,
            backgroundColor: "#FFFFFF",
            quality: 2,
          });
        }}
      />

      <div className="bg-[#F9FAFB] p-6 rounded-xl border border-gray-100 mb-8">
        <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Report Configurations</h3>
        <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-6">
          {FILTER_GRID.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[14px] font-semibold text-[#1B1C1F] mb-2 block">{label}</label>
              <AutocompleteInput
                value={filters[key] ?? ""}
                onChange={(val) => setFilters((prev) => ({ ...prev, [key]: val }))}
                placeholder={placeholder}
                options={getSuggestions(key)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="bg-white text-[#1B1C1F] border border-gray-200 text-[14px] font-bold px-8 h-10 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-primary-blue text-white text-[14px] font-bold px-8 h-10 rounded-lg hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      <div id="custom-report-export">
        {searchApplied && (
          <div className="mb-6">
            <h2 className="text-[20px] font-bold text-[#1B1C1F] mb-2">Generated Report Result</h2>
            <p className="text-gray-500 text-[14px]">Displaying data for <span className="font-bold text-[#1B1C1F]">{LEVELS.find(l => l.id === activeLevel)?.name}</span></p>
          </div>
        )}

        {!searchApplied ? (
          <div className="py-16 text-center text-gray-400 text-[14px] border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            {loading ? "Generating report data..." : "Configure your report and click Generate Report to view data"}
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-[14px] border border-gray-100 rounded-xl">No data found matching your criteria</div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: "#F9FAFB" }}>
                  <th 
                    className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-16 sticky left-0 z-20"
                    style={{ backgroundColor: "#F9FAFB" }}
                  >
                    #
                  </th>
                  {tableColumns.map((col) => {
                    const isProjectName = col.key === 'project_name';
                    return (
                      <th 
                        key={col.key} 
                        className={`px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider ${
                          isProjectName ? "sticky left-16 z-20 shadow-[4px_0_8px_rgba(0,0,0,0.05)] w-75" : ""
                        }`}
                        style={isProjectName ? { backgroundColor: "#F9FAFB" } : undefined}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((item, idx) => (
                  <tr key={item.id} className="group hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
                    <td 
                      className="px-6 py-4 text-[14px] text-gray-600 font-medium sticky left-0 z-10 group-hover:bg-[#f2f4f7] transition-colors"
                      style={{ backgroundColor: "#FFFFFF" }}
                    >
                      {idx + 1}
                    </td>
                    {tableColumns.map((col) => {
                      const isProjectName = col.key === 'project_name';
                      return (
                        <td 
                          key={col.key} 
                          className={`px-4 py-4 text-[14px] ${
                            isProjectName 
                              ? 'font-semibold text-[#1B1C1F] sticky left-16 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.05)] group-hover:bg-[#f2f4f7] transition-colors' 
                              : 'text-gray-600'
                          }`}
                          style={isProjectName ? { backgroundColor: "#FFFFFF" } : undefined}
                        >
                          {renderCellValue(col.key, item[col.key])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Snackbar title="Success!" message={`Report generated successfully.`} visible={snackbar} onClose={handleSnackbarClose} />
    </div>
  );
}

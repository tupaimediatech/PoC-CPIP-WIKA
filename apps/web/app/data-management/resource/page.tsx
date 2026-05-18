"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowSquareOutIcon, ArrowLeft } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { resourceApi, harsatApi } from "@/lib/api";
import TrendHarsatUtama from "@/components/dashboard/TrendHarsatUtamaResource";
import type { Resource, ResourceFilterOptionsResponse } from "@/types/resource";
import { formatCurrency } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/exporter";

// --- Types & Components ---
interface FilterState {
  [key: string]: string;
  year_start: string;
  year_end: string;
}

const AutocompleteInput = ({
  value,
  onChange,
  placeholder,
  options,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  options: string[];
  className?: string;
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
      setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
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
  key: keyof Resource | "year_range";
  label: string;
  optionKey?: keyof ResourceFilterOptionsResponse;
  placeholder?: string;
}[] = [
  {
    key: "resource_id",
    label: "ID Resource",
    placeholder: "Input ID Resource",
  },
  {
    key: "resource_name",
    label: "Nama Resource",
    placeholder: "Input Nama Resource",
  },
  {
    key: "resource_category",
    label: "Kategori Resource",
    optionKey: "resource_category",
    placeholder: "Select Kategori Resource",
  },
  {
    key: "project_name",
    label: "Project Name",
    optionKey: "project_name",
    placeholder: "Select Project Name",
  },
  {
    key: "location",
    label: "Lokasi",
    optionKey: "location",
    placeholder: "Input Lokasi",
  },
  {
    key: "year_range",
    label: "Tahun",
    optionKey: "year",
  },
];

// =====================================
// BUILD FILTERED TREND
// =====================================

function buildFilteredTrend(resources: Resource[]) {
  if (!resources.length) {
    return {
      years: [],
      categories: [],
      data: {},
    };
  }

  const years = Array.from(new Set(resources.map((r) => String(r.year || ""))))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));

  const colors = ["#21409A", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

  const categoryMap = new Map<
    string,
    {
      key: string;
      label: string;
      color: string;
    }
  >();

  resources.forEach((resource, index) => {
    const category = resource.resource_category || "Unknown";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        key: category,
        label: category,
        color: colors[index % colors.length],
      });
    }
  });

  const categories = Array.from(categoryMap.values());

  const data: Record<string, number[]> = {};

  categories.forEach((category) => {
    data[category.key] = years.map((year) => {
      const filtered = resources.filter((r) => String(r.year) === year && (r.resource_category || "Unknown") === category.key);

      if (filtered.length === 0) return 0;

      // Menghitung rata-rata Harga Satuan (price)
      const avgPrice = filtered.reduce((sum, r) => sum + Number(r.price || 0), 0) / filtered.length;

      // Jika harga satuan tidak dalam skala Miliar, hapus pembagi 10^9 atau sesuaikan labelnya
      return avgPrice;
    });
  });

  return {
    years,
    categories,
    data,
  };
}

export default function ResourcesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryQuery = searchParams.get("resource_category")?.trim() ?? "";

  const projectNameQuery = searchParams.get("project_name")?.trim() ?? "";

  const fromLevel3 = searchParams.get("from_level3") === "true";

  const totalHarsatParam = searchParams.get("total_harsat") ? Number(searchParams.get("total_harsat")) : 0;

  const [filterOptions, setFilterOptions] = useState<ResourceFilterOptionsResponse | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    year_start: "",
    year_end: "",
  });

  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [harsatTrend, setHarsatTrend] = useState<any>(null);

  // FILTERED TREND
  const [filteredHarsatTrend, setFilteredHarsatTrend] = useState<any>(null);

  const [searchApplied, setSearchApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [autoFilterApplied, setAutoFilterApplied] = useState(false);

  useEffect(() => {
    setLoading(true);

    Promise.all([resourceApi.list(), resourceApi.filterOptions(), harsatApi.trend()])
      .then(([res, options, trend]) => {
        setAllResources(res.data);
        setFilterOptions(options);

        setHarsatTrend(trend.data);

        // DEFAULT TREND
        setFilteredHarsatTrend(trend.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filterResources = (filterValues: FilterState) => {
    return allResources.filter((resource) => {
      const matchStandard = Object.entries(filterValues).every(([key, value]) => {
        if (!value || key === "year_start" || key === "year_end") {
          return true;
        }

        const resourceValue = resource[key as keyof Resource];

        return String(resourceValue ?? "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      });

      const resourceYear = Number(resource.year);

      const startYear = filterValues.year_start ? Number(filterValues.year_start) : null;

      const endYear = filterValues.year_end ? Number(filterValues.year_end) : null;

      let matchYear = true;

      if (startYear && endYear) {
        matchYear = resourceYear >= startYear && resourceYear <= endYear;
      } else if (startYear) {
        matchYear = resourceYear >= startYear;
      } else if (endYear) {
        matchYear = resourceYear <= endYear;
      }

      return matchStandard && matchYear;
    });
  };

  // =====================================
  // AUTO FILTER FROM LEVEL 3
  // =====================================

  useEffect(() => {
    if ((!categoryQuery && !projectNameQuery) || autoFilterApplied || allResources.length === 0) {
      return;
    }

    const nextFilters = {
      ...filters,
      ...(categoryQuery && {
        resource_category: categoryQuery,
      }),
      ...(projectNameQuery && {
        project_name: projectNameQuery,
      }),
    };

    const filtered = filterResources(nextFilters);

    setFilters(nextFilters);

    setResources(filtered);

    // FILTER TREND
    setFilteredHarsatTrend(buildFilteredTrend(filtered));

    setSearchApplied(true);
    setSnackbar(true);
    setAutoFilterApplied(true);
  }, [categoryQuery, projectNameQuery, allResources, autoFilterApplied]);

  const handleStartYearChange = (val: string) => {
    setFilters((prev) => {
      const newState = {
        ...prev,
        year_start: val,
      };

      if (prev.year_end && val && Number(val) > Number(prev.year_end)) {
        newState.year_end = "";
      }

      return newState;
    });
  };

  const handleEndYearChange = (val: string) => {
    if (!val || !filters.year_start || Number(val) >= Number(filters.year_start)) {
      setFilters((prev) => ({
        ...prev,
        year_end: val,
      }));
    }
  };

  const getSuggestionsForField = (key: string, optionKey?: keyof ResourceFilterOptionsResponse, isEndYear?: boolean): string[] => {
    let options: string[] = [];

    if (optionKey && filterOptions?.[optionKey]) {
      options = (filterOptions[optionKey] as any[]).filter((opt) => opt !== null).map(String);
    } else {
      options = Array.from(new Set(allResources.map((r) => String(r[key as keyof Resource] || "")))).filter((v) => v !== "");
    }

    const sortedOptions = options.sort((a, b) => Number(a) - Number(b));

    if (isEndYear && filters.year_start) {
      return sortedOptions.filter((year) => Number(year) >= Number(filters.year_start));
    }

    return sortedOptions;
  };

  // =====================================
  // SEARCH
  // =====================================

  const handleSearch = () => {
    setLoading(true);

    const filtered = filterResources(filters);

    setResources(filtered);

    // FILTER TREND
    const trend = buildFilteredTrend(filtered);

    setFilteredHarsatTrend(trend);

    setSearchApplied(true);
    setSnackbar(true);

    setLoading(false);
  };

  // =====================================
  // RESET
  // =====================================

  const handleReset = useCallback(() => {
    setFilters({
      year_start: "",
      year_end: "",
    });

    setSearchApplied(false);

    setResources([]);

    // RESET TREND
    setFilteredHarsatTrend(harsatTrend);
  }, [harsatTrend]);

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title="Resources Filter"
        onExport={async () => {
          try {
            await exportElementToPdf("resource-export", {
              filename: "Resources_Report",
              backgroundColor: "#FFFFFF",
              quality: 2,
            });
          } catch (err) {
            console.error(err);
          }
        }}
      />

      {/* FILTER GRID */}

      <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6">
        {FILTER_GRID.map(({ key, label, optionKey, placeholder }) => (
          <div key={key}>
            <label className="text-[14px] font-semibold text-[#1B1C1F] mb-2 block">{label}</label>

            {key === "year_range" ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <AutocompleteInput
                  value={filters.year_start}
                  onChange={handleStartYearChange}
                  placeholder="Start"
                  options={getSuggestionsForField("year", "year")}
                />

                <span className="text-gray-400 text-[12px] font-medium">to</span>

                <AutocompleteInput
                  value={filters.year_end}
                  onChange={handleEndYearChange}
                  placeholder="End"
                  options={getSuggestionsForField("year", "year", true)}
                />
              </div>
            ) : (
              <AutocompleteInput
                value={filters[key as string] ?? ""}
                onChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    [key as string]: val,
                  }))
                }
                placeholder={placeholder}
                options={getSuggestionsForField(key as string, optionKey)}
              />
            )}
          </div>
        ))}
      </div>

      {/* ACTION BUTTONS */}

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

      <div id="resource-export">
        {/* FILTERED TREND */}

        {filteredHarsatTrend && (
          <div className="mb-10 border border-gray-100 rounded-2xl p-6 shadow-sm">
            <TrendHarsatUtama harsatTrend={filteredHarsatTrend} />
          </div>
        )}

        {/* RESULTS HEADER */}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-bold text-[#1B1C1F]">Resource Results</h2>

            {fromLevel3 && (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
              >
                <ArrowLeft size={16} className="text-gray-500 group-hover:text-gray-800 transition-colors" />
                Back to Level 3 P&L
              </button>
            )}
          </div>

          {fromLevel3 && searchApplied && (
            <div className="flex items-center gap-8 bg-[#FCFBFA] px-6 py-4 rounded-xl border border-[#F2EFEA] shadow-sm">
              {projectNameQuery && (
                <div>
                  <p className="text-[12px] text-gray-500 font-medium mb-1">Project Name</p>

                  <p className="text-[14px] font-bold text-[#1B1C1F]">{projectNameQuery}</p>
                </div>
              )}

              {categoryQuery && (
                <div>
                  <p className="text-[12px] text-gray-500 font-medium mb-1">Kategori Resource</p>

                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-blue-50 text-blue-700">
                    {categoryQuery}
                  </div>
                </div>
              )}

              <div className="ml-auto flex flex-col items-end">
                <p className="text-[12px] text-gray-500 font-medium mb-1">Total Harsat (Dari Level 3)</p>

                <p className="text-[16px] font-bold text-[#1B1C1F]">{formatCurrency(totalHarsatParam)}</p>
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}

        {!searchApplied ? (
          <div className="py-16 text-center text-gray-400 text-[14px]">
            {loading ? "Fetching data..." : "Apply filters and click Search to view resources"}
          </div>
        ) : resources.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-[14px]">No resources found</div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="border-collapse min-w-max w-max">
              <thead>
                <tr className="border-b border-gray-100" style={{ backgroundColor: "#F9FAFB" }}>
                  <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">ID Resource</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Resource</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kategori</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Unit</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Quantity</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Harga Satuan</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Total</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Lokasi</th>

                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Tahun</th>

                  <th className="px-4 py-4 sticky right-0 z-20 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]" style={{ backgroundColor: "#F9FAFB" }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {resources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="group hover:transition-colors"
                    style={{
                      backgroundColor: "rgba(249,250,251,0.5)",
                    }}
                  >
                    <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{resource.resource_id}</td>

                    <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{resource.resource_name}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.resource_category || "-"}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.unit || "-"}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.quantity ? Number(resource.quantity).toLocaleString() : "-"}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{formatCurrency(resource.price)}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{formatCurrency(resource.total)}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.project_name || "-"}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.location || "-"}</td>

                    <td className="px-4 py-4 text-[14px] text-gray-600">{resource.year ?? "-"}</td>

                    <td
                      className="px-4 py-4 sticky right-0 bg-white group-hover:transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.05)]"
                      style={{ backgroundColor: "#F9FAFB" }}
                    >
                      <button className="flex items-center gap-1 text-[#21409A] text-[13px] font-medium hover:underline">
                        Details <ArrowSquareOutIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Snackbar
        title="Success!"
        message={`Filters applied. Showing ${resources.length} resources`}
        visible={snackbar}
        onClose={() => setSnackbar(false)}
      />
    </div>
  );
}

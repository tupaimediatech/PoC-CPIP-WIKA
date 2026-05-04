"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { dashboardApi } from "@/lib/api";
import type { DashboardApiResponse, DashboardProject, DashboardSummaryData } from "@/types/dashboard";
import QuickFilterPreview from "@/components/dashboard/QuickFilterPreview";
import KpiCards from "@/components/dashboard/KpiCards";
import DivisionChart from "@/components/dashboard/DivisionChart";
import TrendHarsatUtama from "@/components/dashboard/TrendHarsatUtama";
import SebaranSBUChart from "@/components/dashboard/SebaranSBUChart";
import ParetoTables from "@/components/dashboard/ParetoTables";
import RiskProjectTable from "@/components/dashboard/RiskProjectTable";
import Snackbar from "@/components/ui/Snackbar";

export type ActiveFilters = {
  sbu: string;
  owner: string;
  contract_type: string;
  partnership: string;
  division: string;
  year: string;
  location: string;
  funding_source: string;
  contractRange: string;
};

const EMPTY_FILTERS: ActiveFilters = {
  sbu: "",
  owner: "",
  contract_type: "",
  partnership: "",
  division: "",
  year: "",
  location: "",
  funding_source: "",
  contractRange: "",
};

function computeSummary(projects: DashboardProject[]): DashboardSummaryData {
  const total = projects.length;
  const overbudgetCount = projects.filter((p) => parseFloat(p.cpi) < 1).length;
  const delayCount = projects.filter((p) => parseFloat(p.spi) < 1).length;
  const avgCpi = total > 0 ? projects.reduce((acc, p) => acc + parseFloat(p.cpi ?? "0"), 0) / total : 0;
  const avgSpi = total > 0 ? projects.reduce((acc, p) => acc + parseFloat(p.spi ?? "0"), 0) / total : 0;

  const byDivision: DashboardSummaryData["by_division"] = {};
  projects.forEach((p) => {
    const div = p.division ?? "";
    if (!byDivision[div]) byDivision[div] = { total: 0, avg_cpi: 0, avg_spi: 0, overbudget_count: 0, delay_count: 0 };
    byDivision[div].total++;
    byDivision[div].avg_cpi += parseFloat(p.cpi ?? "0");
    byDivision[div].avg_spi += parseFloat(p.spi ?? "0");
    if (parseFloat(p.cpi) < 1) byDivision[div].overbudget_count++;
    if (parseFloat(p.spi) < 1) byDivision[div].delay_count++;
  });
  Object.keys(byDivision).forEach((k) => {
    byDivision[k].avg_cpi /= byDivision[k].total;
    byDivision[k].avg_spi /= byDivision[k].total;
  });

  const statusBreakdown: Record<string, number> = {};
  projects.forEach((p) => {
    statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;
  });

  const profitability = [...projects]
    .sort((a, b) => parseFloat(b.gross_profit_pct ?? "0") - parseFloat(a.gross_profit_pct ?? "0"))
    .slice(0, 10)
    .map((p) => ({
      name: p.project_name,
      pct: `${parseFloat(p.gross_profit_pct ?? "0").toFixed(1)}%`,
    }));

  const overrunPct = (p: DashboardProject) =>
    p.planned_cost && parseFloat(p.planned_cost) > 0
      ? ((parseFloat(p.actual_cost) - parseFloat(p.planned_cost)) / parseFloat(p.planned_cost)) * 100
      : 0;

  const overrun = [...projects]
    .filter((p) => overrunPct(p) > 0)
    .sort((a, b) => overrunPct(b) - overrunPct(a))
    .slice(0, 10)
    .map((p) => ({ name: p.project_name, pct: `${overrunPct(p).toFixed(1)}%` }));

  return {
    total_projects: total,
    avg_cpi: avgCpi,
    avg_spi: avgSpi,
    overbudget_count: overbudgetCount,
    delay_count: delayCount,
    overbudget_pct: total > 0 ? Math.round((overbudgetCount / total) * 100) : 0,
    delay_pct: total > 0 ? Math.round((delayCount / total) * 100) : 0,
    by_division: byDivision,
    status_breakdown: statusBreakdown,
    profitability,
    overrun,
  };
}

export default function DashboardSummary() {
  const [apiData, setApiData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchApplied, setSearchApplied] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  useEffect(() => {
    dashboardApi
      .getDashboard()
      .then((data) => setApiData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects: DashboardProject[] = useMemo(() => {
    if (!apiData) return [];
    return apiData.projects.data.filter((p) => {
      if (activeFilters.division && (p.division ?? "") !== activeFilters.division) return false;
      if (activeFilters.sbu && (p.sbu ?? "") !== activeFilters.sbu) return false;
      if (activeFilters.owner && p.owner !== activeFilters.owner) return false;
      if (activeFilters.contract_type && (p.contract_type ?? "") !== activeFilters.contract_type) return false;
      if (activeFilters.partnership && (p.partnership ?? "") !== activeFilters.partnership) return false;
      if (activeFilters.funding_source && (p.funding_source ?? "") !== activeFilters.funding_source) return false;
      if (activeFilters.location && (p.location ?? "") !== activeFilters.location) return false;
      if (activeFilters.year && String(p.project_year) !== activeFilters.year) return false;
      if (activeFilters.contractRange) {
        const valueInBillions = parseFloat(p.contract_value || "0") / 1e9;
        const [minStr, maxStr] = activeFilters.contractRange.split("-");
        const min = parseFloat(minStr);
        const max = maxStr?.endsWith("+") ? Infinity : parseFloat(maxStr || "0");
        if (valueInBillions < min || valueInBillions >= max) return false;
      }
      return true;
    });
  }, [apiData, activeFilters]);

  const summary: DashboardSummaryData | null = useMemo(() => {
    if (!apiData) return null;
    return computeSummary(filteredProjects);
  }, [filteredProjects, apiData]);

  const contractOptions = useMemo(() => {
    if (!apiData) return [{ v: "", l: "All" }];
    const values = apiData.projects.data
      .map((p) => parseFloat(p.contract_value || "0") / 1e9)
      .filter((v) => !isNaN(v) && v > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) return [{ v: "", l: "All" }];
    const min = Math.floor(values[0] * 10) / 10;
    const max = Math.ceil(values[values.length - 1] * 10) / 10;
    const range = max - min;
    if (range === 0)
      return [
        { v: "", l: "All" },
        { v: `${min}+`, l: `≥ ${min} M` },
      ];
    const numRanges = 4;
    const step = range / numRanges;
    const ranges = [{ v: "", l: "All" }];
    for (let i = 0; i < numRanges; i++) {
      const start = min + i * step;
      const end = min + (i + 1) * step;
      if (i === numRanges - 1) {
        ranges.push({ v: `${start.toFixed(1)}+`, l: `≥ ${start.toFixed(1)} B` });
      } else {
        ranges.push({ v: `${start.toFixed(1)}-${end.toFixed(1)}`, l: `${start.toFixed(1)} - ${end.toFixed(1)} B` });
      }
    }
    return ranges;
  }, [apiData]);

  const handleSearch = useCallback((filters: ActiveFilters) => {
    setActiveFilters(filters);
    setSearchApplied(true);
    setSnackbar(true);
  }, []);

  const handleReset = useCallback(() => {
    setActiveFilters(EMPTY_FILTERS);
    setSearchApplied(false);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Memuat data dashboard...
      </div>
    );
  }

  if (!summary || !apiData) return null;

  const kpiFilters = { division: activeFilters.division, contractRange: activeFilters.contractRange, year: activeFilters.year };

  return (
    <div className="bg-[#F9FAFB] min-h-screen">
      <QuickFilterPreview filterOptions={apiData.filter_options} onSearch={handleSearch} onReset={handleReset} onExport={() => {}} />

      <div id="dashboard-export-root">
        <KpiCards
          data={summary}
          filters={kpiFilters}
          divisionOptions={apiData.filter_options.division ?? []}
          availableYears={apiData.projects.meta.available_years ?? []}
          contractOptions={contractOptions}
          onChange={(f) =>
            setActiveFilters((prev) => ({
              ...prev,
              division: f.division,
              year: f.year,
              contractRange: f.contractRange,
            }))
          }
        />

        <DivisionChart data={summary} />

        <div className="bg-white flex gap-8 w-full items-stretch" style={{ padding: "18px 32px" }}>
          <TrendHarsatUtama harsatTrend={apiData.harsat_trend} />
          <SebaranSBUChart sbuDistribution={apiData.sbu_distribution} />
        </div>

        <ParetoTables profitability={summary.profitability ?? []} overrun={summary.overrun ?? []} />

        {searchApplied && <RiskProjectTable projects={filteredProjects} />}
      </div>

      <Snackbar
        title="Success!"
        message={`Filters applied. Showing ${filteredProjects.length} projects`}
        visible={snackbar}
        onClose={handleSnackbarClose}
      />
    </div>
  );
}

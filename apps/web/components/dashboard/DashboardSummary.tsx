'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '@/lib/api';
import type { SummaryResponse, Project } from '@/types/project';
import type { DashboardFilters } from '@/types/project';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';
import QuickFilterPreview from '@/components/dashboard/QuickFilterPreview';
import KpiCards from '@/components/dashboard/KpiCards';
import DivisionChart from '@/components/dashboard/DivisionChart';
import TrendHarsatUtama from '@/components/dashboard/TrendHarsatUtama';
import SebaranSBUChart from '@/components/dashboard/SebaranSBUChart';
import ParetoTables from '@/components/dashboard/ParetoTables';
import RiskProjectTable from '@/components/dashboard/RiskProjectTable';
import Snackbar from '@/components/ui/Snackbar';

export default function DashboardSummary() {
  const [summary,  setSummary]  = useState<SummaryResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [searchApplied, setSearchApplied] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const [filters, setFilters] = useState<DashboardFilters>({
    division: '',
    contractRange: '',
    year: '',
  });

  useEffect(() => {
    if (DEMO_MODE) {
      setSummary(mockData.summary as unknown as SummaryResponse);
      setProjects(mockData.projects as unknown as Project[]);
      setLoading(false);
      return;
    }
    Promise.all([
      projectApi.summary(),
      projectApi.list(),
    ])
      .then(([summaryData, listData]) => {
        setSummary(summaryData);
        setProjects(listData.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter(p => {
    if (filters.division && p.division !== filters.division) return false;
    if (filters.contractRange) {
      const val = parseFloat(p.contract_value);
      if (filters.contractRange === '0-500'   && val >= 500) return false;
      if (filters.contractRange === '500-999' && val < 500)  return false;
    }
    return true;
  });

  const handleSearch = useCallback(() => {
    setSearchApplied(true);
    setSnackbar(true);
  }, []);

  const handleReset = useCallback(() => {
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

  if (!summary) return null;

  return (
    <div className="bg-[#F9FAFB] min-h-screen">
      <QuickFilterPreview onSearch={handleSearch} onReset={handleReset} />

      <KpiCards
        data={summary}
        filters={filters}
        onChange={setFilters}
      />
      <DivisionChart data={summary} />

      <div className="bg-white flex gap-8 w-full" style={{ padding: '18px 32px' }}>
        <TrendHarsatUtama />
        <SebaranSBUChart />
      </div>

      <ParetoTables
        profitability={summary.profitability ?? []}
        overrun={summary.overrun ?? []}
      />
      {searchApplied && <RiskProjectTable projects={filteredProjects} />}

      <Snackbar
        title="Success!"
        message={`Filters applied. Showing ${filteredProjects.length} projects`}
        visible={snackbar}
        onClose={handleSnackbarClose}
      />
    </div>
  );
}

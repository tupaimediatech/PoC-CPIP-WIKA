'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarBlankIcon, CaretDownIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import Snackbar from '@/components/ui/Snackbar';
import { projectApi } from '@/lib/api';
import type { Project, FilterOptionsResponse } from '@/types/project';
import { formatKpi, kpiColor } from '@/lib/utils';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';

const FILTER_GRID: { key: string; label: string; optionKey?: keyof FilterOptionsResponse; hasCalendar?: boolean }[] = [
  { key: 'sbu',              label: 'SBU',              optionKey: 'sbu' },
  { key: 'contract_type',    label: 'Contract Type',    optionKey: 'contract_type' },
  { key: 'payment_method',   label: 'Payment Method',   optionKey: 'payment_method' },
  { key: 'owner',            label: 'Project Owner',    optionKey: 'owner' },
  { key: 'division',         label: 'Division',         optionKey: 'division' },
  { key: 'partnership',      label: 'Partnership',      optionKey: 'partnership' },
  { key: 'funding_source',   label: 'Funding Source',   optionKey: 'funding_source' },
  { key: 'location',         label: 'Location',         optionKey: 'location' },
  { key: 'year',             label: 'Year',             optionKey: 'year', hasCalendar: true },
  { key: 'consultant',       label: 'Consultant' },
  { key: 'profit_center',    label: 'Profit Center' },
  { key: 'project_duration', label: 'Project Duration' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchApplied, setSearchApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setFilterOptions(mockData.filterOptions as unknown as FilterOptionsResponse);
      return;
    }
    projectApi.filterOptions().then(setFilterOptions).catch(console.error);
  }, []);

  const handleSearch = () => {
    if (DEMO_MODE) {
      const filtered = (mockData.projects as unknown as Project[]).filter(p => {
        for (const [k, v] of Object.entries(filters)) {
          if (!v) continue;
          const val = (p as unknown as Record<string, unknown>)[k];
          if (val !== undefined && String(val) !== v) return false;
        }
        return true;
      });
      setProjects(filtered);
      setSearchApplied(true);
      setSnackbar(true);
      return;
    }
    setLoading(true);
    const params: Record<string, string | number> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });

    projectApi.list(params as any)
      .then((res) => {
        setProjects(res.data);
        setSearchApplied(true);
        setSnackbar(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleReset = useCallback(() => {
    setFilters({});
    setSearchApplied(false);
    setProjects([]);
  }, []);

  const handleSnackbarClose = useCallback(() => setSnackbar(false), []);

  const getOptions = (optionKey?: keyof FilterOptionsResponse): string[] => {
    if (!optionKey || !filterOptions) return [];
    return (filterOptions[optionKey] as (string | number)[]).map(String);
  };

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader title="Projects Filter" onExport={() => {}} />

      <div className="grid grid-cols-3 gap-x-8 gap-y-5 mb-6">
        {FILTER_GRID.map(({ key, label, optionKey, hasCalendar }) => (
          <div key={key}>
            <label className="text-[13px] font-bold text-[#1B1C1F] mb-1.5 block">{label}</label>
            <div className="relative">
              {hasCalendar && (
                <CalendarBlankIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
              <select
                value={filters[key] ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                className={`w-full appearance-none bg-white border border-gray-200 rounded-lg text-[13px] text-gray-600 focus:outline-none focus:border-gray-400 transition-colors ${hasCalendar ? 'pl-9' : 'pl-4'} pr-10`}
                style={{ height: '42px' }}
              >
                <option value="">Select {label}</option>
                {getOptions(optionKey).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <CaretDownIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mb-8">
        <button onClick={handleSearch} disabled={loading}
          className="flex items-center justify-center bg-primary-blue text-white text-[13px] font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-60"
          style={{ width: '100px', height: '38px' }}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        <button onClick={handleReset}
          className="flex items-center justify-center border border-gray-300 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors"
          style={{ width: '100px', height: '38px' }}>
          Reset
        </button>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Project Results</h2>

      {!searchApplied ? (
        <div className="py-16 text-center text-gray-400 text-[14px]">
          Apply filters and click Search to view projects
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
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">SBU</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Gross Profit</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">SPI</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">CPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project, idx) => (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{project.project_name}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-600">{project.sbu ?? '-'}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-600">{project.owner ?? '-'}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 text-right">
                    {project.gross_profit_pct ? `${project.gross_profit_pct}%` : '-'}
                  </td>
                  <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(String(project.spi))}`}>
                    {formatKpi(String(project.spi))}
                  </td>
                  <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(String(project.cpi))}`}>
                    {formatKpi(String(project.cpi))}
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline">
                      Details <ArrowSquareOutIcon size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Snackbar title="Success!" message={`Filters applied. Showing ${projects.length} projects`}
        visible={snackbar} onClose={handleSnackbarClose} />
    </div>
  );
}

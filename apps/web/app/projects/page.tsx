'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarBlankIcon, CaretDownIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import Snackbar from '@/components/ui/Snackbar';
import mockData from '@/data/mock-data.json';
import { formatKpi, kpiColor } from '@/lib/utils';

const FILTERS = mockData.projectsFilter;
const RESULTS = mockData.projectResults;

type FilterKey = keyof typeof FILTERS;

const FILTER_GRID: { key: FilterKey; label: string; hasCalendar?: boolean }[] = [
  { key: 'sbu', label: 'SBU' },
  { key: 'contractType', label: 'Contract Type' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'projectOwner', label: 'Project Owner' },
  { key: 'contractMethod', label: 'Contract Method' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'fundingSource', label: 'Funding Source' },
  { key: 'consultant', label: 'Consultant' },
  { key: 'location', label: 'Location' },
  { key: 'year', label: 'Year', hasCalendar: true },
  { key: 'profitCenter', label: 'Profit Center' },
  { key: 'projectDuration', label: 'Project Duration' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<FilterKey, string>>(
    Object.fromEntries(Object.keys(FILTERS).map(k => [k, ''])) as Record<FilterKey, string>
  );
  const [searchApplied, setSearchApplied] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const handleSearch = () => {
    setSearchApplied(true);
    setSnackbar(true);
  };

  const handleReset = () => {
    setFilters(Object.fromEntries(Object.keys(FILTERS).map(k => [k, ''])) as Record<FilterKey, string>);
    setSearchApplied(false);
  };

  const handleSnackbarClose = useCallback(() => setSnackbar(false), []);

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader title="Projects Filter" onExport={() => {}} />

      <div className="grid grid-cols-3 gap-x-8 gap-y-5 mb-6">
        {FILTER_GRID.map(({ key, label, hasCalendar }) => (
          <div key={key}>
            <label className="text-[13px] font-bold text-[#1B1C1F] mb-1.5 block">{label}</label>
            <div className="relative">
              {hasCalendar && (
                <CalendarBlankIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
              <select
                value={filters[key]}
                onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                className={`w-full appearance-none bg-white border border-gray-200 rounded-lg text-[13px] text-gray-600 focus:outline-none focus:border-gray-400 transition-colors ${hasCalendar ? 'pl-9' : 'pl-4'} pr-10`}
                style={{ height: '42px' }}
              >
                <option value="">Select {label}</option>
                {FILTERS[key].map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <CaretDownIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mb-8">
        <button
          onClick={handleSearch}
          className="flex items-center justify-center bg-primary-blue text-white text-[13px] font-bold rounded-lg hover:brightness-110 transition-all"
          style={{ width: '100px', height: '38px' }}
        >
          Search
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center border border-gray-300 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors"
          style={{ width: '100px', height: '38px' }}
        >
          Reset
        </button>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Project Results</h2>

      {!searchApplied ? (
        <div className="py-16 text-center text-gray-400 text-[14px]">
          No project data displayed
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Unit Rate (m&sup2;/km)</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Gross Profit</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">SPI</th>
                <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">CPI</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {RESULTS.map((project, idx) => (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{project.name}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{project.unitRate}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{project.grossProfit}</td>
                  <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(String(project.spi))}`}>
                    {formatKpi(String(project.spi))}
                  </td>
                  <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(String(project.cpi))}`}>
                    {formatKpi(String(project.cpi))}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                    >
                      Details
                      <ArrowSquareOutIcon size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Snackbar
        title="Success!"
        message={`Filters applied. Showing ${RESULTS.length} projects`}
        visible={snackbar}
        onClose={handleSnackbarClose}
      />
    </div>
  );
}

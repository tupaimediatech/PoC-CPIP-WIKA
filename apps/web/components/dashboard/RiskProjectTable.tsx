'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlass, ArrowsDownUp } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatKpi, kpiColor } from '@/lib/utils';
import type { Project } from '@/types/project';

type Props = {
  projects: Project[];
};

const ITEMS_PER_PAGE = 8;

export default function RiskProjectTable({ projects }: Props) {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'cpi' | 'spi'; direction: 'asc' | 'desc' } | null>({
    key: 'cpi',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (!sortConfig) return 0;
        const valA = parseFloat(a[sortConfig.key] ?? '0');
        const valB = parseFloat(b[sortConfig.key] ?? '0');
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });
  }, [projects, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleSort = (key: 'cpi' | 'spi') => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const statusBadge = (status: string) => {
    if (status === 'critical') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF1F1] border border-[#FFE4E4] w-fit">
          <div className="w-2 h-2 rounded-full bg-[#C53030]" />
          <span className="text-[#C53030] text-[12px] font-bold">Critical</span>
        </div>
      );
    }
    if (status === 'warning') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FEF3C7] w-fit">
          <div className="w-2 h-2 rounded-full bg-[#D97706]" />
          <span className="text-[#D97706] text-[12px] font-bold">At Risk</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#D1FAE5] w-fit">
        <div className="w-2 h-2 rounded-full bg-[#059669]" />
        <span className="text-[#059669] text-[12px] font-bold">On Track</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 bg-white w-full" style={{ padding: '24px 32px' }}>

      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">
          Project List
        </h2>

        <div className="relative" style={{ height: '38px' }}>
          <input
            type="text"
            placeholder="Search project here"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-4 pr-10 h-full bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-gray-400 placeholder:text-gray-400 transition-all"
            style={{ width: '340px' }}
          />
          <MagnifyingGlass className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>

      <div
        className="overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm"
             >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Division</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Contract Value</th>
              <th className="px-4 py-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                <div
                  className="flex items-center gap-1 cursor-pointer hover:text-gray-800 transition-colors justify-end"
                  onClick={() => handleSort('cpi')}
                >
                  CPI <ArrowsDownUp size={14} className="text-gray-400" />
                </div>
              </th>
              <th className="px-4 py-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                <div
                  className="flex items-center gap-1 cursor-pointer hover:text-gray-800 transition-colors justify-end"
                  onClick={() => handleSort('spi')}
                >
                  SPI <ArrowsDownUp size={14} className="text-gray-400" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedProjects.map((project, index) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{startIdx + index + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">
                  {project.project_name}
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700">
                  {project.division}
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">
                  {formatCurrency(project.contract_value)}
                </td>
                <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(project.cpi)}`}>
                  {formatKpi(project.cpi)}
                </td>
                <td className={`px-4 py-4 text-[14px] font-bold text-right ${kpiColor(project.spi)}`}>
                  {formatKpi(project.spi)}
                </td>
                <td className="px-6 py-4">
                  {statusBadge(project.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedProjects.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-[14px]">
            No projects found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">
            Showing {startIdx + 1} - {Math.min(startIdx + ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[13px] text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                  currentPage === page
                    ? 'bg-primary-blue text-white font-bold'
                    : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[13px] text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

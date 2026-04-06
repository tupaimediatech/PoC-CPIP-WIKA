'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowsDownUp,
  CaretLeft,
  CaretRight,
  CaretDoubleLeft,
  CaretDoubleRight,
} from '@phosphor-icons/react';
import { formatCurrency, formatKpi } from '@/lib/utils';
import type { Project, ProjectStatus } from '@/types/project';

type SortField = 'cpi' | 'spi' | 'contract_value' | 'project_name';
type SortDir   = 'asc' | 'desc';

type Props = {
  projects: Project[];
  sortBy: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = {
    good:     { dot: 'bg-[#22C55E]', bg: 'bg-[#F0FDF4]', text: 'text-[#166534]', label: 'On Track'  },
    warning:  { dot: 'bg-[#EAB308]', bg: 'bg-[#FFFBEB]', text: 'text-[#854D0E]', label: 'At Risk'   },
    critical: { dot: 'bg-[#EF4444]', bg: 'bg-[#FEF2F2]', text: 'text-[#991B1B]', label: 'Critical'  },
    unknown:  { dot: 'bg-[#94A3B8]', bg: 'bg-[#F8FAFC]', text: 'text-[#475569]', label: 'Incomplete'  },
  }[status];

  return (
    <span
      className={`inline-flex items-center border border-opacity-50 ${config.bg} ${config.text}`}
      style={{ width: '93px', height: '18px', paddingLeft: '8px', paddingRight: '8px', gap: '8px', borderRadius: '12px' }}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className="text-[10px] font-bold leading-none truncate">{config.label}</span>
    </span>
  );
}

function KpiCell({ value }: { value: string | null }) {
  const num = value === null ? Number.NaN : parseFloat(value);
  const colorClass = isNaN(num) ? 'text-gray-600' : num >= 1 ? 'text-[#16A34A]' : 'text-[#DC2626]';
  return <span className={`text-[13px] font-bold ${colorClass}`}>{formatKpi(value)}</span>;
}

export default function ProjectTable({ projects, sortBy, sortDir, onSort }: Props) {
  const router = useRouter();
  void sortDir;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage    = 10;
  const totalPages      = Math.ceil(projects.length / itemsPerPage);
  const startIndex      = (currentPage - 1) * itemsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);
  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto grow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FBFCFD] border-b border-gray-100">
              <th className="px-6 py-3 text-left text-[11px] text-gray-400 uppercase tracking-wider w-15">#</th>
              <th className="px-4 py-3 text-left text-[11px] text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  Project Name
                  <button onClick={() => onSort('project_name')}>
                    <ArrowsDownUp size={12} className={sortBy === 'project_name' ? 'text-blue-600' : 'text-gray-300'} />
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-[11px] text-gray-400 uppercase tracking-wider">Division</th>
              {/* ── Year column ── */}
              <th className="px-4 py-3 text-left text-[11px] text-gray-400 uppercase tracking-wider">Year</th>
              <th className="px-4 py-3 text-[11px] text-gray-400 uppercase tracking-wider text-right">Contract Value</th>
              <th className="px-4 py-3 text-right text-[11px] text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1 justify-end">
                  CPI
                  <button onClick={() => onSort('cpi')}>
                    <ArrowsDownUp size={12} className={sortBy === 'cpi' ? 'text-blue-600' : 'text-gray-300'} />
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-[11px] text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1 justify-end">
                  SPI
                  <button onClick={() => onSort('spi')}>
                    <ArrowsDownUp size={12} className={sortBy === 'spi' ? 'text-blue-600' : 'text-gray-300'} />
                  </button>
                </div>
              </th>
              <th className="px-8 py-3 text-left text-[11px] text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {currentProjects.map((project, idx) => (
              <tr
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="hover:bg-[#F8F9FC] cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{startIndex + idx + 1}</td>
                <td className="px-4 py-4 text-[13px] font-bold text-[#1B1C1F] group-hover:text-blue-700">{project.project_name}</td>
                <td className="px-4 py-4 text-[13px] text-gray-600 font-medium">{project.division}</td>
                {/* ── Year cell ── */}
                <td className="px-4 py-4 text-[13px] text-gray-500 font-medium">{project.project_year ?? '—'}</td>
                <td className="px-4 py-4 text-[13px] text-gray-600 font-medium text-right">{formatCurrency(project.contract_value)}</td>
                <td className="px-4 py-4 text-right"><KpiCell value={project.cpi} /></td>
                <td className="px-4 py-4 text-right"><KpiCell value={project.spi} /></td>
                <td className="px-8 py-4"><StatusBadge status={project.status} /></td>
              </tr>
            ))}
            {currentProjects.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                  Tidak ada project ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
        <div className="text-[13px] text-gray-400 font-medium">
          Showing {projects.length === 0 ? 0 : Math.min(startIndex + 1, projects.length)} to{' '}
          {Math.min(startIndex + itemsPerPage, projects.length)} of {projects.length} entries
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
            <CaretDoubleLeft size={18} className="text-gray-400" />
          </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
            <CaretLeft size={18} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-1 px-2">
            {[...Array(totalPages)].map((_, i) => (
              <button key={i + 1} onClick={() => goToPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-[13px] font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
            <CaretRight size={18} className="text-[#1B1C1F]" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
            <CaretDoubleRight size={18} className="text-[#1B1C1F]" />
          </button>
        </div>
      </div>
    </div>
  );
}

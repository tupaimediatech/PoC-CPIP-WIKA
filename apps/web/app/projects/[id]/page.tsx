'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowSquareOutIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import { projectApi } from '@/lib/api';
import type { ProjectPhaseListResponse } from '@/types/project';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';

function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString('id-ID')}`;
}

export default function Level3Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [data, setData] = useState<ProjectPhaseListResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setData(mockData.level3 as unknown as ProjectPhaseListResponse['data']);
      setLoading(false);
      return;
    }
    projectApi.periods(projectId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Loading...
    </div>
  );

  if (!data) return <div className="p-8 text-gray-400">No data found</div>;

  const totalBQ  = data.phases.reduce((sum, p) => sum + p.bqExternal, 0);
  const totalRAB = data.phases.reduce((sum, p) => sum + p.rabInternal, 0);
  const totalDeviasi = totalBQ > 0 ? ((totalBQ - totalRAB) / totalBQ) * 100 : 0;

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 3 WBS Overview - ${data.project_name}`}
        pills={[
          { label: 'SBU', value: data.sbu ?? '-' },
          { label: 'Project Owner', value: data.owner ?? '-' },
          { label: 'Contract Type', value: data.contract_type ?? '-' },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Tahap Pekerjaan</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">BQ External</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">RAB Internal</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deviasi (%)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.phases.map((phase, idx) => (
              <tr key={phase.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{phase.name}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{formatRupiah(phase.bqExternal)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{formatRupiah(phase.rabInternal)}</td>
                <td className="px-4 py-4 text-right">
                  <div className={`inline-flex items-center gap-1 text-[14px] font-bold ${phase.deviasi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {phase.deviasi >= 0 ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
                    {Math.abs(phase.deviasi).toFixed(1)}%
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/${phase.id}`)}
                    className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline">
                    Details <ArrowSquareOutIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t border-gray-200">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">{formatRupiah(totalBQ)}</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">{formatRupiah(totalRAB)}</td>
              <td className="px-4 py-4 text-right">
                <span className={`text-[14px] font-bold ${totalDeviasi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalDeviasi.toFixed(1)}%
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Projects" href="/projects" />
    </div>
  );
}

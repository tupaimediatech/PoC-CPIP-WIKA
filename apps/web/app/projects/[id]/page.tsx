'use client';

import { useRouter } from 'next/navigation';
import { ArrowSquareOutIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import mockData from '@/data/mock-data.json';

const data = mockData.level3;

function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString('id-ID')}`;
}

export default function Level3Page() {
  const router = useRouter();

  const totalBQ = data.phases.reduce((sum, p) => sum + p.bqExternal, 0);
  const totalRAB = data.phases.reduce((sum, p) => sum + p.rabInternal, 0);
  const totalDeviasi = totalBQ > 0 ? ((totalBQ - totalRAB) / totalBQ) * 100 : 0;

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 3 WBS Overview - ${data.projectName}`}
        pills={[
          { label: 'SBU', value: data.sbu },
          { label: 'Project Owner', value: data.projectOwner },
          { label: 'Contract Type', value: data.contractType },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Tahp Pekerjaan</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">BQ External</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">RAB Internal</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deviasi</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.phases.map((phase, idx) => (
              <tr key={phase.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{phase.name}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">{formatRupiah(phase.bqExternal)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">{formatRupiah(phase.rabInternal)}</td>
                <td className="px-4 py-4 text-right">
                  <span className={`inline-flex items-center gap-1 text-[14px] font-bold ${phase.deviasi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {phase.deviasi >= 0 ? <ArrowUpIcon size={12} weight="bold" /> : <ArrowDownIcon size={12} weight="bold" />}
                    {phase.deviasi >= 0 ? '+' : ''}{phase.deviasi.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => router.push(`/projects/1/${phase.id}`)}
                    className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                  >
                    Details
                    <ArrowSquareOutIcon size={14} />
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
                <span className={`inline-flex items-center gap-1 text-[14px] font-bold ${totalDeviasi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalDeviasi >= 0 ? <ArrowUpIcon size={12} weight="bold" /> : <ArrowDownIcon size={12} weight="bold" />}
                  {totalDeviasi >= 0 ? '+' : ''}{totalDeviasi.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 2" href="/projects" />
    </div>
  );
}

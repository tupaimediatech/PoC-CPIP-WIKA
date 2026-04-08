'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import { periodApi } from '@/lib/api';
import type { WorkItemLevel4, WorkItemLevel4ListResponse } from '@/types/project';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';

function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString('id-ID')}`;
}

function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} jt`;
  return value.toLocaleString('id-ID');
}

export default function Level4Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;
  const tahapId = Number(params.tahapId);

  const [data, setData] = useState<WorkItemLevel4ListResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setData(mockData.level4 as unknown as WorkItemLevel4ListResponse['data']);
      setLoading(false);
      return;
    }
    periodApi.workItems(tahapId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tahapId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Loading...
    </div>
  );

  if (!data) return <div className="p-8 text-gray-400">No data found</div>;

  const totalBiaya = data.items.filter(i => !i.is_total_row).reduce((sum, i) => sum + i.totalBiaya, 0);

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 4 Harsat Per Sumber Daya - Tahap ${data.tahap}`}
        pills={[
          { label: 'Tahap', value: data.tahap },
          { label: 'RAB Internal', value: formatRupiahShort(data.rabInternal) },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Nama Item</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Total Biaya</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Realisasi</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deviasi (%)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.items.filter(i => !i.is_total_row).map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{item.name}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{formatRupiah(item.totalBiaya)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{formatRupiah(item.realisasi)}</td>
                <td className={`px-4 py-4 text-[14px] font-bold text-right ${item.deviasi_pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {item.deviasi_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/${tahapId}/${item.id}`)}
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
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">{formatRupiah(totalBiaya)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

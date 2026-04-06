'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import mockData from '@/data/mock-data.json';

const data = mockData.level4;

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

  const totalBiaya = data.items.reduce((sum, item) => sum + item.totalBiaya, 0);

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 4 Harsat Per Sumber Daya - Tahap ${data.tahap.replace('Pekerjaan ', '')}`}
        pills={[
          { label: 'Tahap', value: data.tahap },
          { label: 'RAB Internal', value: `${formatRupiahShort(data.rabInternal)}` },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Item Sumber Daya</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Volume</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Satuan</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Harsat Internal</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Total Biaya</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{item.name}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{item.volume.toLocaleString('id-ID')}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{item.satuan}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 text-right">{formatRupiah(item.harsatInternal)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">{formatRupiah(item.totalBiaya)}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/${params.tahapId}/${item.id}`)}
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
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL Tahap {data.tahap.replace('Pekerjaan ', '')}</td>
              <td className="px-4 py-4" />
              <td className="px-4 py-4" />
              <td className="px-4 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">{formatRupiah(totalBiaya)}</td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

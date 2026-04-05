'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/analytics/PageHeader';
import SCurveChart from '@/components/analytics/SCurveChart';
import mockData from '@/data/mock-data.json';

const data = mockData.level7;

export default function Level7Page() {
  const router = useRouter();

  const spiColor = data.spiValue >= 1.0 ? 'text-green-600' : data.spiValue >= 0.9 ? 'text-yellow-600' : 'text-red-600';
  const statusColor = data.spiValue >= 1.0 ? 'text-green-600' : data.spiValue >= 0.9 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title="Level 7A Kamus Risiko (Historical Risk Register)"
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kategori Risiko</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deskripsi Kejadian</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Dampak (Rp / hari)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.risks.map((risk, idx) => (
              <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{risk.kategori}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{risk.deskripsi}</td>
                <td className="px-4 py-4 text-[14px] text-red-600 font-medium">{risk.dampak}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FEF3C7] w-fit">
                    <div className="w-2 h-2 rounded-full bg-[#D97706]" />
                    <span className="text-[#D97706] text-[12px] font-bold">{risk.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Level 7B Project Timeline</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Rencana</p>
          <p className="text-[14px] text-gray-600">{data.timeline.planned}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Aktual</p>
          <p className="text-[14px] text-gray-600">
            {data.timeline.actual.replace(` (${data.timeline.delayNote})`, '')}
            <span className="text-red-600 font-bold ml-1">({data.timeline.delayNote})</span>
          </p>
        </div>
      </div>

      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visualisasi</h3>
      <div className="mb-8">
        <SCurveChart
          months={data.sCurve.months}
          plan={data.sCurve.plan}
          actual={data.sCurve.actual}
        />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-primary-blue rounded-lg flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">SPI</span>
        </div>
        <span className="text-[14px] font-bold text-[#1B1C1F]">Schedule Performance Index</span>
      </div>

      <div className="border border-gray-100 rounded-xl p-6 mb-8 flex items-center gap-8">
        <p className={`text-[48px] font-bold ${spiColor}`}>{data.spiValue.toFixed(2)}</p>
        <div>
          <p className={`text-[16px] font-bold ${statusColor} mb-1`}>{data.spiStatus}</p>
          <p className="text-[14px] text-gray-600 leading-relaxed">{data.spiInsight}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center justify-center border border-primary-blue text-primary-blue text-[13px] font-bold rounded-lg px-6 hover:bg-blue-50 transition-colors"
          style={{ height: '38px' }}
        >
          Finish Analysis
        </button>
      </div>
    </div>
  );
}

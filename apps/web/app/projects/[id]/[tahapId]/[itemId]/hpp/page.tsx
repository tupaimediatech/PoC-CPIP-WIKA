'use client';

import { useParams } from 'next/navigation';
import { ChartBarIcon, ChatTextIcon } from '@phosphor-icons/react';
import PageHeader from '@/components/analytics/PageHeader';
import ActionButton from '@/components/analytics/ActionButton';
import mockData from '@/data/mock-data.json';

const data = mockData.level6;

export default function Level6Page() {
  const params = useParams();

  const cpiColor = data.cpiValue >= 1.0 ? 'text-green-600' : data.cpiValue >= 0.9 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 6 Analisa HPP & CPI - Proyek ${data.projectName}`}
        pills={[
          { label: 'Tahap', value: data.tahap },
          { label: 'Item', value: data.item },
          { label: 'Volume', value: data.volume },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Komponen HPP (Hraga Pokok Produksi)</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">HPP Tender</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">HPP RKP</th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Realization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.components.map((comp, idx) => (
              <tr key={comp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4">
                  <p className="text-[14px] font-semibold text-[#1B1C1F]">{comp.name}</p>
                  <p className="text-[12px] text-gray-400">{comp.sub}</p>
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">Rp{comp.hppTender.toFixed(1)} M</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">Rp{comp.hppRkp.toFixed(1)} M</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-right">Rp{comp.realization.toFixed(1)} M</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t border-gray-200">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL HPP</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">Rp{data.totalHpp.tender.toFixed(1)} M</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">Rp{data.totalHpp.rkp.toFixed(1)} M</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-right">Rp{data.totalHpp.realization.toFixed(1)} M</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visual Indicator</h3>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-primary-blue rounded-lg flex items-center justify-center">
              <ChartBarIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Cost Performance Index</span>
          </div>
          <p className={`text-[48px] font-bold text-center mb-2 ${cpiColor}`}>
            {data.cpiValue.toFixed(2)}
          </p>
          <p className="text-[14px] font-bold text-center text-[#1B1C1F]">{data.cpiStatus}</p>
        </div>

        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-primary-blue rounded-lg flex items-center justify-center">
              <ChatTextIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Summary Insight</span>
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed">{data.summaryInsight}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <ActionButton label="Cek Risk & Timeline" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/risk`} />
      </div>
    </div>
  );
}

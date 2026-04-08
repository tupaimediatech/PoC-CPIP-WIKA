'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/components/analytics/PageHeader';
import SCurveChart from '@/components/analytics/SCurveChart';
import { projectApi } from '@/lib/api';
import type { ProjectRisk, ProgressCurveResponse } from '@/types/project';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-600',
  low: 'text-green-600',
};

export default function Level7Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [curve, setCurve] = useState<ProgressCurveResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setRisks(mockData.level7.risks as unknown as ProjectRisk[]);
      setCurve(mockData.level7.progressCurve as unknown as ProgressCurveResponse['data']);
      setLoading(false);
      return;
    }
    Promise.all([
      projectApi.risks(projectId),
      projectApi.progressCurve(projectId),
    ])
      .then(([riskRes, curveRes]) => {
        setRisks(riskRes.data);
        setCurve(curveRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Loading...
    </div>
  );

  const spi = curve?.spi_value ?? 0;
  const spiColor = spi >= 1.0 ? 'text-green-600' : spi >= 0.9 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader title="Level 7A Kamus Risiko (Historical Risk Register)" onExport={() => {}} />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kategori Risiko</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deskripsi</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Dampak Finansial</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {risks.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-[13px]">No risk data available</td></tr>
            ) : risks.map((risk, idx) => (
              <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{risk.category ?? '-'}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{risk.risk_title}</td>
                <td className="px-4 py-4 text-[14px] text-red-600 font-medium">
                  {risk.financial_impact_idr
                    ? `Rp${Number(risk.financial_impact_idr).toLocaleString('id-ID')}`
                    : '-'}
                </td>
                <td className={`px-4 py-4 text-[14px] font-bold ${SEVERITY_COLOR[risk.severity ?? ''] ?? 'text-gray-600'}`}>
                  {risk.severity ?? '-'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FEF3C7] w-fit">
                    <div className="w-2 h-2 rounded-full bg-[#D97706]" />
                    <span className="text-[#D97706] text-[12px] font-bold">{risk.status ?? 'Open'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Level 7B Project Timeline</h2>

      {curve?.timeline ? (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Rencana</p>
            <p className="text-[14px] text-gray-600">{curve.timeline.planned ?? 'Data tidak tersedia'}</p>
          </div>
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Aktual</p>
            <p className="text-[14px] text-gray-600">
              {curve.timeline.actual ?? 'Data tidak tersedia'}
              {curve.timeline.delay_months > 0 && (
                <span className="text-red-600 font-bold ml-1">({curve.timeline.delay_note})</span>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {curve?.sCurve && (
        <>
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visualisasi</h3>
          <div className="mb-8">
            <SCurveChart
              months={curve.sCurve.months}
              plan={curve.sCurve.plan}
              actual={curve.sCurve.actual}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-primary-blue rounded-lg flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">SPI</span>
        </div>
        <span className="text-[14px] font-bold text-[#1B1C1F]">Schedule Performance Index</span>
      </div>

      <div className="border border-gray-100 rounded-xl p-6 mb-8 flex items-center gap-8">
        <p className={`text-[48px] font-bold ${spiColor}`}>{spi.toFixed(2)}</p>
        <div>
          <p className={`text-[16px] font-bold ${spiColor} mb-1`}>{curve?.spi_status}</p>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {`The SPI value of ${spi.toFixed(2)} indicates ${spi >= 1 ? 'the project is ahead of or on schedule.' : 'the project is behind schedule.'}`}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center justify-center border border-primary-blue text-primary-blue text-[13px] font-bold rounded-lg px-6 hover:bg-blue-50 transition-colors"
          style={{ height: '38px' }}>
          Finish Analysis
        </button>
      </div>
    </div>
  );
}

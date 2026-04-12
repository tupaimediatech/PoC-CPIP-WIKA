"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChartBarIcon, ChatTextIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import ActionButton from "@/components/analytics/ActionButton";
import BackButton from "@/components/analytics/BackButton";
import { projectApi, periodApi } from "@/lib/api";
import type { InsightResponse, WorkItemLevel4 } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatM(value: number): string {
  const formatted = (value / 1_000_000_000).toFixed(1);
  return `Rp${formatted} M`;
}

export default function Level6Page() {
  const params = useParams();
  const projectId = Number(params.id);
  const tahapId = Number(params.tahapId);
  const itemId = Number(params.itemId);

  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [apiData, setApiData] = useState<any | null>(null);
  const [workItem, setWorkItem] = useState<WorkItemLevel4 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setApiData(mockData.level6.apiRawData); // Asumsi struktur mock mengikuti API
      setInsight({ summary: mockData.level6.summaryInsight, recommendations: [] } as unknown as InsightResponse);
      const items = (mockData.level4 as any).items;
      setWorkItem(items.find((i: any) => i.id === itemId) ?? items[0] ?? null);
      setLoading(false);
      return;
    }

    Promise.all([
      projectApi.insight(projectId),
      periodApi.workItems(tahapId), // Mengambil data sesuai JSON yang Anda berikan
    ])
      .then(([insightRes, workItemsRes]) => {
        setInsight(insightRes);
        setApiData(workItemsRes.data);

        const found = workItemsRes.data.items.find((i: any) => i.id === itemId);
        setWorkItem(found ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, tahapId, itemId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  // --- LOGIKA PERHITUNGAN DATA API ---

  const totalRABInternal = apiData?.rabInternal || 0;
  const totalBQExternal = apiData?.bqExternal || 0;

  // 1. Hitung Actual Cost (AC) -> Total dari kolom 'realisasi'
  const totalActualCost = apiData?.items?.reduce((acc: number, curr: any) => acc + (Number(curr.realisasi) || 0), 0) || 0;

  // 2. Hitung Earned Value (EV) -> Total dari kolom 'totalBiaya' (Budgeted Cost of Work Performed)
  const totalEarnedValue = apiData?.items?.reduce((acc: number, curr: any) => acc + (Number(curr.totalBiaya) || 0), 0) || 0;

  // 3. Hitung CPI (CPI = EV / AC)
  const calculatedCPI = totalActualCost > 0 ? totalEarnedValue / totalActualCost : 0;

  const cpiColor = calculatedCPI >= 1.0 ? "text-green-600" : calculatedCPI >= 0.9 ? "text-yellow-600" : "text-red-600";
  const cpiStatus = calculatedCPI >= 1.0 ? "Under Budget" : calculatedCPI >= 0.9 ? "Near Budget" : "Over Budget";

  // Data baris tabel HPP
  const hppRows = [
    {
      id: 1,
      name: "Biaya Langsung (BL)",
      sub: "(Material, Upah, Alat, Subkon)",
      tender: totalBQExternal * 0.85,
      rkp: totalRABInternal * 0.85,
      actual: totalActualCost * 0.85,
    },
    {
      id: 2,
      name: "Biaya Tidak Langsung (BTL)",
      sub: "(Sekretariat, Pegawai, Kendaraan, Umum)",
      tender: totalBQExternal * 0.15,
      rkp: totalRABInternal * 0.15,
      actual: totalActualCost * 0.15,
    },
  ];

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 6 Analisa HPP & CPI - ${apiData?.tahap || "Project"}`}
        pills={[
          { label: "Tahap", value: apiData?.tahap || "-" },
          ...(workItem ? [{ label: "Item", value: workItem.name }] : []),
          ...(workItem ? [{ label: "Volume", value: `${workItem.volume} ${workItem.unit}` }] : []),
        ]}
        onExport={() => {}}
      />

      {/* Tabel HPP */}
      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase">Komponen HPP</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase">HPP Tender (BQ)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase">HPP RKP (Internal)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase">Realization (Actual)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {hppRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{row.id}</td>
                <td className="px-4 py-4">
                  <p className="text-[14px] font-semibold text-[#1B1C1F]">{row.name}</p>
                  <p className="text-[12px] text-gray-400 mt-1">{row.sub}</p>
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium">{formatM(row.tender)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium">{formatM(row.rkp)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium">{formatM(row.actual)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t-2">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL HPP</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatM(totalBQExternal)}</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatM(totalRABInternal)}</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatM(totalActualCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Visual Indicator */}
      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visual Indicator</h3>
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* CPI Card */}
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChartBarIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Cost Performance Index (CPI)</span>
          </div>
          <p className={`text-[48px] font-bold text-center mb-2 ${cpiColor}`}>{calculatedCPI.toFixed(2)}</p>
          <p className="text-[14px] font-bold text-center text-[#1B1C1F]">{cpiStatus}</p>
          <p className="text-[11px] text-gray-400 text-center mt-4 italic">Rumus: Total Budgeted Cost / Total Actual Cost</p>
        </div>

        {/* Insight Card */}
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChatTextIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Summary Insight</span>
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed">{insight?.summary.text ?? "Data insight belum tersedia untuk periode ini."}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <BackButton label="Back to Dashboard" href={`/projects/${projectId}`} />
        <ActionButton label="Cek Risk & Timeline" href={`/projects/${projectId}/${tahapId}/${itemId}/risk`} />
      </div>
    </div>
  );
}

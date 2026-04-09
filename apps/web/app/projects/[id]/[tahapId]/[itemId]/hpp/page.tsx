"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChartBarIcon, ChatTextIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import ActionButton from "@/components/analytics/ActionButton";
import BackButton from "@/components/analytics/BackButton";
import { projectApi, periodApi } from "@/lib/api";
import type { InsightResponse, ProjectPhaseListResponse, WorkItemLevel4 } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatM(value: number): string {
  // Menggunakan Intl.NumberFormat agar format angka lebih rapi (Rp8.0 M)
  const formatted = (value / 1_000_000_000).toFixed(1);
  return `Rp${formatted} M`;
}

export default function Level6Page() {
  const params = useParams();
  const projectId = Number(params.id);
  const tahapId = Number(params.tahapId);
  const itemId = Number(params.itemId);

  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [periods, setPeriods] = useState<ProjectPhaseListResponse["data"] | null>(null);
  const [workItem, setWorkItem] = useState<WorkItemLevel4 | null>(null);
  const [cpi, setCpi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setCpi(mockData.level6.cpiValue);
      setPeriods(mockData.level3 as unknown as ProjectPhaseListResponse["data"]);
      setInsight({ summary: mockData.level6.summaryInsight, recommendations: [] } as unknown as InsightResponse);
      const items = (mockData.level4 as unknown as { items: WorkItemLevel4[] }).items;
      setWorkItem(items.find((i) => i.id === itemId) ?? items[0] ?? null);
      setLoading(false);
      return;
    }
    Promise.all([projectApi.insight(projectId), projectApi.detail(projectId), projectApi.periods(projectId), periodApi.workItems(tahapId)])
      .then(([insightRes, detailRes, periodsRes, workItemsRes]) => {
        setInsight(insightRes);
        setCpi(parseFloat(detailRes.data.cpi ?? "0"));
        setPeriods(periodsRes.data);
        const found = workItemsRes.data.items.find((i) => i.id === itemId);
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

  const phase = periods?.phases.find((p) => p.id === tahapId) ?? periods?.phases[0];
  const cpiVal = cpi ?? 0;
  const cpiColor = cpiVal >= 1.0 ? "text-green-600" : cpiVal >= 0.9 ? "text-yellow-600" : "text-red-600";
  const cpiStatus = cpiVal >= 1.0 ? "Under Budget" : cpiVal >= 0.9 ? "Near Budget" : "Over Budget";

  // Penyesuaian hppRows agar sesuai dengan foto (3 kolom angka)
  const hppRows = phase
    ? [
        {
          id: 1,
          name: "Biaya Langsung (BL)",
          sub: "(Material, Upah, Alat, Subkon)",
          tender: 8_000_000_000, // Ganti dengan phase.tenderBL jika ada di API
          rkp: phase.rabInternal * 0.85,
          actual: phase.realisasi * 0.85,
        },
        {
          id: 3, // Di foto menggunakan angka 3
          name: "Biaya Tidak Langsung (BTL)",
          sub: "(Sekretariat, Pegawai, Kendaraan, Umum)",
          tender: 1_500_000_000, // Ganti dengan phase.tenderBTL jika ada di API
          rkp: phase.rabInternal * 0.15,
          actual: phase.realisasi * 0.15,
        },
      ]
    : [];

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 6 Analisa HPP & CPI - ${periods?.project_name ?? "Project"}`}
        pills={[...(phase ? [{ label: "Tahap", value: phase.name }] : []), ...(workItem ? [{ label: "Item", value: workItem.name }] : [])]}
        onExport={() => {}}
      />

      {hppRows.length > 0 ? (
        <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Komponen HPP (Harga Pokok Produksi)
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">HPP Tender</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">HPP RKP</th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Realization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hppRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium align-top">{row.id}</td>
                  <td className="px-4 py-4">
                    <p className="text-[14px] font-semibold text-[#1B1C1F]">{row.name}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{row.sub}</p>
                  </td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-left align-top">{formatM(row.tender)}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-left align-top">{formatM(row.rkp)}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 font-medium text-left align-top">{formatM(row.actual)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F9FAFB] border-t-2">
                <td className="px-6 py-4" />
                <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL HPP</td>
                <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-left">{formatM(9_500_000_000)}</td>
                <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-left">{formatM(phase!.rabInternal)}</td>
                <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F] text-left">{formatM(phase!.realisasi)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="mb-8 py-10 text-center text-gray-400 border border-gray-100 rounded-xl">No HPP data available for this period</div>
      )}

      {/* Visual Indicator section remains same */}
      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visual Indicator</h3>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChartBarIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Cost Performance Index</span>
          </div>
          <p className={`text-[48px] font-bold text-center mb-2 ${cpiColor}`}>{cpiVal.toFixed(2)}</p>
          <p className="text-[14px] font-bold text-center text-[#1B1C1F]">{cpiStatus}</p>
        </div>

        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChatTextIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Summary Insight</span>
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed">{insight?.summary.text ?? "No insight available."}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <BackButton label="Back to Level 5" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}`} />
        <ActionButton label="Cek Risk & Timeline" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/risk`} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChartBarIcon, ChatTextIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import ActionButton from "@/components/analytics/ActionButton";
import BackButton from "@/components/analytics/BackButton";
import { workItemApi } from "@/lib/api";
import type { WorkItemHppResponse } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(2)} T`;
  if (abs >= 1_000_000_000)     return `Rp${sign}${(abs / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000)         return `Rp${sign}${(abs / 1_000_000).toFixed(1)} Jt`;
  return `Rp${sign}${abs.toLocaleString("id-ID")}`;
}

export default function Level6Page() {
  const params    = useParams<{ id: string; tahapId: string; itemId: string }>();
  const itemId    = Number(params.itemId);

  const [data, setData]       = useState<WorkItemHppResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const level4  = mockData.level4 as unknown as { tahap: string; rabInternal: number };
      const level6  = mockData.level6;
      setData({
        tahap:       level4.tahap ?? "-",
        rabInternal: level4.rabInternal ?? 0,
        realisasi:   level6.totalHpp?.realization ?? 0,
        workItem:    { id: itemId, name: level6.item ?? "-", item_no: null, volume: null, satuan: null },
        cpi:         level6.cpiValue ?? 0,
        insight:     { bullets: [], summary: { level: "info", text: String(level6.summaryInsight ?? "") } },
      });
      setLoading(false);
      return;
    }

    workItemApi
      .hpp(itemId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  if (!data) return <div className="p-8 text-gray-400">Data HPP tidak ditemukan</div>;

  const { tahap, rabInternal, realisasi, workItem, cpi, insight } = data;

  const hppRows = [
    {
      id: 1,
      name: "Biaya Langsung (BL)",
      sub:  "(Material, Upah, Alat, Subkon)",
      tender: rabInternal * 0.85,
      rkp:    rabInternal * 0.85,
      actual: realisasi   * 0.85,
    },
    {
      id: 2,
      name: "Biaya Tidak Langsung (BTL)",
      sub:  "(Sekretariat, Pegawai, Kendaraan, Umum)",
      tender: rabInternal * 0.15,
      rkp:    rabInternal * 0.15,
      actual: realisasi   * 0.15,
    },
  ];

  const cpiColor  = cpi >= 1.0 ? "text-green-600" : cpi >= 0.9 ? "text-yellow-600" : "text-red-600";
  const cpiStatus = cpi >= 1.0 ? "Under Budget"   : cpi >= 0.9 ? "Near Budget"     : "Over Budget";

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 6 Analisa HPP & CPI — ${workItem.name}`}
        pills={[
          { label: "Tahap",  value: tahap },
          { label: "Item",   value: workItem.name },
          { label: "Volume", value: workItem.volume != null ? `${workItem.volume.toLocaleString("id-ID")} ${workItem.satuan ?? ""}`.trim() : "-" },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Komponen HPP (Harga Pokok Produksi)</th>
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
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium align-top">{formatCompact(row.tender)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium align-top">{formatCompact(row.rkp)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 font-medium align-top">{formatCompact(row.actual)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t-2">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL HPP</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCompact(rabInternal)}</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCompact(rabInternal)}</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCompact(realisasi)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visual Indicator</h3>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChartBarIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Cost Performance Index</span>
          </div>
          <p className={`text-[48px] font-bold text-center mb-2 ${cpiColor}`}>{cpi.toFixed(2)}</p>
          <p className="text-[14px] font-bold text-center text-[#1B1C1F]">{cpiStatus}</p>
        </div>

        <div className="border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <ChatTextIcon size={16} className="text-white" weight="fill" />
            </div>
            <span className="text-[14px] font-bold text-[#1B1C1F]">Summary Insight</span>
          </div>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {insight?.summary?.text ?? "No insight available."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <BackButton
          label="Back to Level 4 Detail"
          href={`/projects/${params.id}/${params.tahapId}/${params.itemId}`}
        />
        <ActionButton
          label="Cek Risk & Timeline"
          href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/risk`}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/analytics/PageHeader";
import SCurveChart from "@/components/analytics/SCurveChart";
import { projectApi } from "@/lib/api";
import type { RiskTimelineResponse } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

export default function Level7Page() {
  const router    = useRouter();
  const params    = useParams();
  const projectId = Number(params.id);

  const [data, setData]       = useState<RiskTimelineResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setData({
        risks:      mockData.level7.risks as any,
        risks_meta: { total: mockData.level7.risks.length, open_count: 0, critical_count: 0, total_financial_impact: 0 },
        timeline:   mockData.level7.progressCurve?.timeline as any ?? null,
        spi_value:  mockData.level7.progressCurve?.spi_value ?? 0,
        spi_status: mockData.level7.progressCurve?.spi_status ?? "-",
        sCurve:     mockData.level7.progressCurve?.sCurve as any ?? null,
      });
      setLoading(false);
      return;
    }

    projectApi
      .riskTimeline(projectId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  if (!data) return <div className="p-8 text-gray-400">Data tidak ditemukan</div>;

  const { risks, timeline, spi_value: spi, spi_status, sCurve } = data;

  const spiColor = spi >= 1.0 ? "text-green-600" : spi >= 0.9 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader title="Level 7A Kamus Risiko (Historical Risk Register)" onExport={() => {}} />

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
            {risks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-[13px]">
                  No risk data available
                </td>
              </tr>
            ) : (
              risks.map((risk, idx) => {
                const statusColor =
                  risk.status === "open"       ? "bg-red-50 border-red-100 text-red-600" :
                  risk.status === "monitoring" ? "bg-yellow-50 border-yellow-100 text-yellow-600" :
                  risk.status === "mitigated"  ? "bg-green-50 border-green-100 text-green-600" :
                                                  "bg-gray-50 border-gray-100 text-gray-500";
                const dotColor =
                  risk.status === "open"       ? "bg-red-500" :
                  risk.status === "monitoring" ? "bg-yellow-500" :
                  risk.status === "mitigated"  ? "bg-green-500" : "bg-gray-400";

                return (
                  <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                    <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{risk.category ?? "-"}</td>
                    <td className="px-4 py-4 text-[14px] text-gray-700">{risk.risk_title}</td>
                    <td className="px-4 py-4 text-[14px] text-red-600 font-medium">
                      {risk.financial_impact_idr
                        ? `+Rp${Number(risk.financial_impact_idr).toLocaleString("id-ID")}`
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-bold w-fit ${statusColor}`}>
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        {risk.status ?? "-"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Level 7B Project Timeline</h2>

      {timeline && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Rencana</p>
            <p className="text-[14px] text-gray-600">{timeline.planned ?? "Data tidak tersedia"}</p>
          </div>
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Aktual</p>
            <p className="text-[14px] text-gray-600">
              {timeline.actual ?? "Data tidak tersedia"}
              {timeline.delay_months > 0 && (
                <span className="text-red-600 font-bold ml-1">({timeline.delay_note})</span>
              )}
            </p>
          </div>
        </div>
      )}

      {sCurve && (
        <>
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visualisasi</h3>
          <div className="mb-8">
            <SCurveChart months={sCurve.months} plan={sCurve.plan} actual={sCurve.actual} />
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
          <p className={`text-[16px] font-bold ${spiColor} mb-1`}>{spi_status}</p>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {spi >= 1
              ? `SPI ${spi.toFixed(2)} — proyek berjalan sesuai atau lebih cepat dari rencana.`
              : `SPI ${spi.toFixed(2)} — proyek mengalami keterlambatan jadwal.`}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center justify-center border border-primary-blue text-primary-blue text-[13px] font-bold rounded-lg px-6 hover:bg-blue-50 transition-colors"
          style={{ height: "38px" }}
        >
          Finish Analysis
        </button>
      </div>
    </div>
  );
}

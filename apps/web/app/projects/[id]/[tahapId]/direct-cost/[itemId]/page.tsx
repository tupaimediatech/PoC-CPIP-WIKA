"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import ActionButton from "@/components/analytics/ActionButton";
import { workItemApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { WorkItemDetailLevel5 } from "@/types/project";

function InfoRow({ label, value, valueClass }: { label: string; value: string | null; valueClass?: string }) {
  return (
    <div className="p-4 border border-gray-100 rounded-xl mb-3 last:mb-0 bg-white">
      <p className="text-[14px] font-bold text-[#1B1C1F] mb-1">{label}</p>
      <p className={`text-[15px] text-gray-500 ${valueClass ?? ""}`}>{value ?? "-"}</p>
    </div>
  );
}

function extractYear(poNumber: string | null): string | null {
  if (!poNumber) return null;
  const match = poNumber.match(/(\d{4})/);
  return match ? match[1] : null;
}

function formatRealisasiPengiriman(pct: number): { text: string; color: string } {
  if (pct >= 100) return { text: `${pct.toFixed(0)}% (Selesai)`, color: "text-green-600 font-medium" };
  if (pct >= 75) return { text: `${pct.toFixed(0)}% (Sebagian Besar)`, color: "text-blue-600 font-medium" };
  if (pct >= 50) return { text: `${pct.toFixed(0)}% (Setengah Jalan)`, color: "text-yellow-600 font-medium" };
  if (pct > 0) return { text: `${pct.toFixed(0)}% (Dalam Proses)`, color: "text-orange-500 font-medium" };
  return { text: "0% (Belum Dimulai)", color: "text-gray-500" };
}

function formatDeviasiHarga(harsatInternal: number, harsatActual: number): { text: string; color: string; deviasiPct: number } {
  if (!harsatInternal || !harsatActual) return { text: "-", color: "", deviasiPct: 0 };
  const deviasi = ((harsatInternal - harsatActual) / harsatInternal) * 100;
  const sign = deviasi >= 0 ? "+" : "";
  const label = Math.abs(deviasi) <= 5 ? "(Wajar)" : deviasi > 0 ? "(Di Bawah Market)" : "(Perlu Review)";
  const color = Math.abs(deviasi) <= 5 ? "text-green-600 font-medium" : deviasi > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium";
  return { text: `${sign}${deviasi.toFixed(1)}% ${label}`, color, deviasiPct: deviasi };
}

function calcRating(progressPct: number, deviasiPct: number): { score: number; color: string } {
  // Delivery score (1-5) based on progress_actual_pct
  const delivery = progressPct >= 100 ? 5 : progressPct >= 90 ? 4 : progressPct >= 75 ? 3 : progressPct >= 50 ? 2 : 1;
  // Price score (1-5) based on deviasi harga (positive = under market = good)
  const overrun = -deviasiPct; // flip: negative deviasi means overrun
  const price = overrun <= 0 ? 5 : overrun <= 5 ? 4 : overrun <= 10 ? 3 : overrun <= 20 ? 2 : 1;
  const score = Math.round((delivery + price) / 2);
  const color = score >= 4 ? "text-green-600 font-medium" : score >= 3 ? "text-yellow-600 font-medium" : "text-red-600 font-medium";
  return { score, color };
}

export default function Level5Page() {
  const params = useParams();
  const itemId = Number(params.itemId);

  const [item, setItem] = useState<WorkItemDetailLevel5 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    workItemApi
      .detail(itemId)
      .then((res) => setItem(res.data))
      .catch((err) => console.error("Error fetching work item:", err))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  if (!item) return <div className="p-8 text-center text-gray-400">Data item tidak ditemukan.</div>;

  const realisasi = item.realisasi_pengiriman
    ? { text: item.realisasi_pengiriman, color: "text-blue-600 font-medium" }
    : formatRealisasiPengiriman(item.progress_actual_pct);
  const deviasi = formatDeviasiHarga(item.harsat_internal, item.harsat_actual);
  const deviasiText = item.deviasi_harga_market ?? deviasi.text;
  const rating = calcRating(item.progress_actual_pct, deviasi.deviasiPct);

  const progressColor =
    item.progress_actual_pct >= item.progress_plan_pct
      ? "text-green-600"
      : item.progress_actual_pct >= item.progress_plan_pct * 0.9
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 6 Data Monitoring Kontrak Vendor - ${item.item_name}`}
        pills={[
          ...(item.tahap ? [{ label: "Tahap", value: item.tahap }] : []),
          { label: "Item", value: item.item_name },
          { label: "Volume", value: `${item.volume.toLocaleString("id-ID")} ${item.satuan ?? ""}`.trim() },
        ]}
        onExport={() => {}}
      />

      <div className="grid grid-cols-2 gap-6 mb-8 mt-6">
        {/* Left: Vendor Info */}
        <div className="border border-gray-100 rounded-2xl p-6">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-5">Informasi Vendor</h3>
          <InfoRow label="Nama Vendor" value={item.vendor_name} />
          <InfoRow label="Tahun Perolehan" value={extractYear(item.po_number)} />
          <InfoRow label="Lokasi Vendor" value={item.vendor_lokasi} />
          <InfoRow label="Rating Performa" value={`${rating.score}/5`} valueClass={rating.color} />
        </div>

        {/* Right: Contract & Price Status */}
        <div className="border border-gray-100 rounded-2xl p-6">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-5">Status Kontrak dan Harga</h3>
          <InfoRow label="Nilai Kontrak Vendor" value={item.vendor_contract_value ? formatCurrency(item.vendor_contract_value) : null} />
          <InfoRow label="Harga Satuan Vendor" value={item.harsat_internal ? formatCurrency(item.harsat_internal) : null} />
          <InfoRow label="Realisasi Pengiriman" value={realisasi.text} valueClass={realisasi.color} />
          <InfoRow label="Deviasi Harga Market" value={deviasiText} valueClass={deviasi.color} />
          {/* <InfoRow label="Retensi 5%" value={item.retention ? formatCurrency(item.retention) : null} />
          <InfoRow label="Sisa Hutang" value={item.outstanding_debt ? formatCurrency(item.outstanding_debt) : null} /> */}
        </div>
      </div>

      {/* Progress & EVM */}
      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Progress & Earned Value</h3>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Progress Plan</p>
          <p className="text-[24px] font-bold text-[#1B1C1F]">{item.progress_plan_pct.toFixed(1)}%</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Actual Progress</p>
          <p className={`text-[24px] font-bold ${progressColor}`}>{item.progress_actual_pct.toFixed(1)}%</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Bobot Pekerjaan</p>
          <p className="text-[24px] font-bold text-[#1B1C1F]">{item.bobot_pct.toFixed(1)}%</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Planned Value (PV)</p>
          <p className="text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(item.planned_value)}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Earned Value (EV)</p>
          <p className="text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(item.earned_value)}</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-5">
          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">Actual Cost (AC)</p>
          <p className="text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(item.actual_cost_item)}</p>
        </div>
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mb-8">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Catatan</h3>
          <div className="bg-[#F9FAFB] rounded-2xl p-6 border border-gray-50">
            <p className="text-[14px] text-gray-600 leading-relaxed">{item.notes}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <BackButton label="Kembali ke Level 5" href={`/projects/${params.id}/${params.tahapId}/direct-cost`} />
        <ActionButton label="Cek Risk & Timeline" href={`/projects/${params.id}/risks`} />
      </div>
    </div>
  );
}

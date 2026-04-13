"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { materialApi } from "@/lib/api";
import type { MaterialDetailResponse } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatVolume(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null) return "-";
  return `${value.toLocaleString("id-ID")} ${unit ?? ""}`.trim();
}

export default function Level5Page() {
  const router  = useRouter();
  const params  = useParams<{ id: string; tahapId: string; itemId: string; subItemId: string }>();
  const projectId  = params.id;
  const itemId     = Number(params.itemId);
  const materialId = Number(params.subItemId);

  const [data, setData]       = useState<MaterialDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const level4   = mockData.level4 as unknown as { tahap: string };
      const material = (mockData.level5 as any[]).find((m) => m.id === materialId)
        ?? (mockData.level5 as any[])[0];
      setData({
        tahap:    level4.tahap ?? "-",
        workItem: null,
        material,
      });
      setLoading(false);
      return;
    }

    materialApi
      .show(materialId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [materialId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-gray-400">Detail material tidak ditemukan</div>;
  }

  const { material, workItem, tahap } = data;

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 5 - Detail Sumber Daya - ${material.material_type ?? "Material"}`}
        pills={[
          { label: "Tahap", value: tahap },
          { label: "Item", value: workItem?.name ?? "-" },
          { label: "Volume", value: formatVolume(material.volume, material.satuan) },
        ]}
        onExport={() => {}}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Informasi Vendor */}
        <div className="border border-gray-100 rounded-xl p-6">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Informasi Vendor</h3>
          <div className="space-y-3 text-[14px] text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Nama Vendor</span>
              <span className="font-semibold text-[#1B1C1F] text-right">{material.vendor.nama ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tahun Perolehan</span>
              <span className="font-semibold text-[#1B1C1F]">{material.vendor.tahunPerolehan ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lokasi Vendor</span>
              <span className="font-semibold text-[#1B1C1F] text-right">{material.vendor.lokasi ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rating Performa</span>
              <span className="font-semibold text-[#1B1C1F]">{material.vendor.ratingPerforma ?? "-"}</span>
            </div>
          </div>
        </div>

        {/* Status Kontrak dan Harga */}
        <div className="border border-gray-100 rounded-xl p-6">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Status Kontrak dan Harga</h3>
          <div className="space-y-3 text-[14px] text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Nilai Kontrak Vendor</span>
              <span className="font-semibold text-[#1B1C1F]">{material.kontrak.nilaiKontrak ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Harga Satuan Vendor</span>
              <span className="font-semibold text-[#1B1C1F]">{material.kontrak.hargaSatuan ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Realisasi Pengiriman</span>
              <span className="font-semibold text-[#1B1C1F]">{material.kontrak.realisasiPengiriman ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deviasi Harga Market</span>
              <span className="font-semibold text-[#1B1C1F]">{material.kontrak.deviasiHargaMarket ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {material.catatanMonitoring && (
        <div className="border border-gray-100 rounded-xl p-6 mb-6">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Catatan Monitoring</h3>
          <p className="text-[14px] text-gray-600 leading-relaxed">{material.catatanMonitoring}</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => router.push(`/projects/${projectId}/${params.tahapId}/${itemId}/hpp`)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-blue text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Cek HPP Level <ArrowSquareOutIcon size={14} />
        </button>
      </div>

      <BackButton label="Back to Level 4" href={`/projects/${projectId}/${params.tahapId}/${itemId}`} />
    </div>
  );
}

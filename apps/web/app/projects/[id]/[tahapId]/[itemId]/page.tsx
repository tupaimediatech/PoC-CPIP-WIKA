"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import ActionButton from "@/components/analytics/ActionButton";
import { periodApi } from "@/lib/api";
import type { MaterialLogLevel5 } from "@/types/project";

// Komponen Baris Informasi dengan styling yang diperbarui agar sesuai gambar
function InfoRow({ label, value, valueClass }: { label: string; value: string | null; valueClass?: string }) {
  return (
    <div className="p-4 border border-gray-100 rounded-xl mb-3 last:mb-0 bg-white">
      <p className="text-[14px] font-bold text-[#1B1C1F] mb-1">{label}</p>
      <p className={`text-[15px] text-gray-500 ${valueClass ?? ""}`}>{value ?? "-"}</p>
    </div>
  );
}

export default function Level5Page() {
  const params = useParams();
  const tahapId = Number(params.tahapId);
  const itemId = Number(params.itemId);

  const [material, setMaterial] = useState<MaterialLogLevel5 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    periodApi
      .materials(tahapId)
      .then((res) => {
        // Mengambil array dari res.data sesuai struktur JSON Anda
        const materialList = res.data || [];

        // Mencari item yang sesuai dengan itemId dari URL params
        const found = materialList.find((m: any) => m.id === itemId);

        setMaterial(found || null);
      })
      .catch((err) => {
        console.error("Error fetching material data:", err);
      })
      .finally(() => setLoading(false));
  }, [tahapId, itemId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Memuat Data...
      </div>
    );

  if (!material) return <div className="p-8 text-center text-gray-400">Data material tidak ditemukan.</div>;

  return (
    <div className="bg-white min-h-screen" style={{ padding: "32px" }}>
      {/* Header dengan 3 indikator sesuai referensi gambar */}
      <PageHeader
        title={`Level 5 Data Monitoring Kontrak Vendor - ${material.material_type}`}
        pills={[
          { label: "Tahap", value: "Pekerjaan Struktur" }, // Bisa disesuaikan jika nama tahap ada di API
          { label: "Item", value: material.material_type },
          { label: "Volume", value: `${material.volume.toLocaleString("id-ID")} ${material.satuan}` },
        ]}
        onExport={() => {
          /* Logika Export */
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 mt-6">
        {/* Sisi Kiri: Informasi Vendor */}
        <div className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-[#FFFFFF]">
          <h3 className="text-[18px] font-bold text-[#1B1C1F] mb-5">Informasi Vendor</h3>
          <InfoRow label="Nama Vendor" value={material.vendor.nama} />
          <InfoRow label="Tahun Perolehan" value={material.vendor.tahunPerolehan} />
          <InfoRow label="Lokasi Vendor" value={material.vendor.lokasi} />
          <InfoRow label="Rating Performa" value={material.vendor.ratingPerforma} />
        </div>

        {/* Sisi Kanan: Status Kontrak dan Harga */}
        <div className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-[#FFFFFF]">
          <h3 className="text-[18px] font-bold text-[#1B1C1F] mb-5">Status Kontrak dan Harga</h3>
          <InfoRow label="Nilai Kontrak Vendor" value={material.kontrak.nilaiKontrak} />
          <InfoRow label="Harga Satuan Vendor" value={material.kontrak.hargaSatuan} />
          <InfoRow label="Realisasi Pengiriman" value={material.kontrak.realisasiPengiriman} />
          <InfoRow
            label="Deviasi Harga Market"
            value={material.kontrak.deviasiHargaMarket === "+0%" ? "0% (Wajar)" : `${material.kontrak.deviasiHargaMarket} (Wajar)`}
            valueClass="text-green-600 font-medium"
          />
        </div>
      </div>

      {/* Bagian Catatan Monitoring */}
      <div className="mb-10">
        <h3 className="text-[18px] font-bold text-[#1B1C1F] mb-3">Catatan Monitoring</h3>
        <div className="bg-[#F9FAFB] rounded-2xl p-6 border border-gray-50">
          <p className="text-[15px] text-gray-600 leading-relaxed">{material.catatanMonitoring || "Tidak ada catatan monitoring untuk item ini."}</p>
        </div>
      </div>

      {/* Tombol Aksi di bagian bawah */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-8">
        <BackButton label="Kembali ke Level 4" href={`/projects/${params.id}/${params.tahapId}`} />
        <ActionButton label="Cek HPP Level" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/hpp`} />
      </div>
    </div>
  );
}

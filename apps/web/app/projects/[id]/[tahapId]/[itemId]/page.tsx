'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import ActionButton from '@/components/analytics/ActionButton';
import { periodApi } from '@/lib/api';
import type { MaterialLogLevel5 } from '@/types/project';
import { DEMO_MODE } from '@/lib/demo';
import mockData from '@/data/mock-data.json';

function InfoRow({ label, value, valueClass }: { label: string; value: string | null; valueClass?: string }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-[12px] font-bold text-[#1B1C1F] mb-0.5">{label}</p>
      <p className={`text-[14px] text-gray-600 ${valueClass ?? ''}`}>{value ?? '-'}</p>
    </div>
  );
}

export default function Level5Page() {
  const params = useParams();
  const tahapId = Number(params.tahapId);
  const itemId  = Number(params.itemId);

  const [material, setMaterial] = useState<MaterialLogLevel5 | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const materials = mockData.level5 as unknown as MaterialLogLevel5[];
      setMaterial(materials.find(m => m.id === itemId) ?? materials[0] ?? null);
      setLoading(false);
      return;
    }
    periodApi.materials(tahapId)
      .then((res) => {
        const found = res.data.find((m) => m.id === itemId) ?? res.data[0] ?? null;
        setMaterial(found);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tahapId, itemId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Loading...
    </div>
  );

  if (!material) return <div className="p-8 text-gray-400">No material data found</div>;

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 5 Data Monitoring Kontrak Vendor - ${material.material_type ?? 'Material'}`}
        pills={[
          { label: 'Item', value: material.material_type ?? '-' },
          { label: 'Volume', value: material.volume ? `${material.volume} ${material.satuan ?? ''}` : '-' },
        ]}
        onExport={() => {}}
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Informasi Vendor</h3>
          <InfoRow label="Nama Vendor"      value={material.vendor.nama} />
          <InfoRow label="Tahun Perolehan"  value={material.vendor.tahunPerolehan} />
          <InfoRow label="Lokasi Vendor"    value={material.vendor.lokasi} />
          <InfoRow label="Rating Performa"  value={material.vendor.ratingPerforma} />
        </div>

        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Status Kontrak dan Harga</h3>
          <InfoRow label="Nilai Kontrak Vendor"  value={material.kontrak.nilaiKontrak} />
          <InfoRow label="Harga Satuan Vendor"   value={material.kontrak.hargaSatuan} />
          <InfoRow label="Realisasi Pengiriman"  value={material.kontrak.realisasiPengiriman} />
          <InfoRow label="Deviasi Harga Market"  value={material.kontrak.deviasiHargaMarket} valueClass="text-green-600" />
        </div>
      </div>

      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Catatan Monitoring</h3>
      <div className="bg-[#F9FAFB] rounded-xl p-5 mb-8">
        <p className="text-[14px] text-gray-600 leading-relaxed">
          {material.catatanMonitoring ?? 'Tidak ada catatan monitoring.'}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <BackButton label="Back to Level 4" href={`/projects/${params.id}/${params.tahapId}`} />
        <ActionButton label="Cek HPP Level" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/hpp`} />
      </div>
    </div>
  );
}

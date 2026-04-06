'use client';

import { useParams } from 'next/navigation';
import PageHeader from '@/components/analytics/PageHeader';
import BackButton from '@/components/analytics/BackButton';
import ActionButton from '@/components/analytics/ActionButton';
import mockData from '@/data/mock-data.json';

const data = mockData.level5;

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-[12px] font-bold text-[#1B1C1F] mb-0.5">{label}</p>
      <p className={`text-[14px] text-gray-600 ${valueClass || ''}`}>{value}</p>
    </div>
  );
}

export default function Level5Page() {
  const params = useParams();

  return (
    <div className="bg-white min-h-screen" style={{ padding: '24px 32px' }}>
      <PageHeader
        title={`Level 5 Data Monitoring Kontrak Vendor - ${data.item}`}
        pills={[
          { label: 'Tahap', value: data.tahap },
          { label: 'Item', value: data.item },
          { label: 'Volume', value: data.volume },
        ]}
        onExport={() => {}}
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Informasi Vendor</h3>
          <InfoRow label="Nama Vendor" value={data.vendor.nama} />
          <InfoRow label="Tahun Perolehan" value={data.vendor.tahunPerolehan} />
          <InfoRow label="Lokasi Vendor" value={data.vendor.lokasi} />
          <InfoRow label="Rating Performa" value={data.vendor.ratingPerforma} />
        </div>

        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Status Kontrak dan Harga</h3>
          <InfoRow label="Nilai Kontrak Vendor" value={data.kontrak.nilaiKontrak} />
          <InfoRow label="Harga Satuan Vendor" value={data.kontrak.hargaSatuan} />
          <InfoRow label="Realisasi Pengiriman" value={data.kontrak.realisasiPengiriman} />
          <InfoRow label="Deviasi Harga Marjet" value={data.kontrak.deviasiHargaMarket} valueClass="text-green-600" />
        </div>
      </div>

      <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-3">Catatan Monitoring</h3>
      <div className="bg-[#F9FAFB] rounded-xl p-5 mb-8">
        <p className="text-[14px] text-gray-600 leading-relaxed">{data.catatanMonitoring}</p>
      </div>

      <div className="flex items-center justify-between">
        <BackButton label="Back to Level 4" href={`/projects/${params.id}/${params.tahapId}`} />
        <ActionButton label="Cek HPP Level" href={`/projects/${params.id}/${params.tahapId}/${params.itemId}/hpp`} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { projectApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function ProfitLossPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);
  const phaseId = Number(params.phaseId);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi
      .profitloss(projectId)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("API Error:", err);
        setData({});
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  if (!data) return <div className="p-8 text-gray-400">No data found</div>;

  // Mengambil data dari API
  const penjualan = data.penjualan || 0;

  const biayaLangsung = data.biaya_langsung || {};
  const material = biayaLangsung.material || 0;
  const upah = biayaLangsung.upah || 0;
  const alat = biayaLangsung.alat || 0;
  const subkon = biayaLangsung.subkon || 0;

  const biayaTakLangsung = data.biaya_tak_langsung || {};
  const fasilitas = biayaTakLangsung.fasilitas || 0;
  const sekretariat = biayaTakLangsung.sekretariat || 0;
  const kendaraan = biayaTakLangsung.kendaraan || 0;
  const personalia = biayaTakLangsung.personalia || 0;
  const keuangan = biayaTakLangsung.keuangan || 0;
  const umum = biayaTakLangsung.umum || 0;

  const biayaLainLain = data.biaya_lain_lain || {};
  const biayaPemeliharaan = biayaLainLain.biaya_pemeliharaan || 0;
  const risiko = biayaLainLain.risiko || 0;

  // Menghitung Total untuk setiap bagian
  const totalBiayaLangsung = material + upah + alat + subkon;
  const totalBiayaTakLangsung = fasilitas + sekretariat + kendaraan + personalia + keuangan + umum;
  const totalBiayaLainLain = biayaPemeliharaan + risiko;

  // Total Biaya (II + III + IV)
  const totalBiaya = totalBiayaLangsung + totalBiayaTakLangsung + totalBiayaLainLain;

  // Beban PPH Final & Laba dari API atau kalkulasi
  const bebanPphFinal = data.beban_pph_final || 0;
  const labaKotor = data.laba_kotor ?? penjualan - totalBiaya - bebanPphFinal;
  const lsp = data.lsp ?? 0;

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 3  Profit & Loss Summary - ${data.project_name}`}
        pills={[
          { label: "SBU", value: data.sbu ?? "-" },
          { label: "Project Owner", value: data.owner ?? "-" },
          { label: "Contract Type", value: data.contract_type ?? "-" },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Uraian</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Realisasi</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {/* ── I. PENJUALAN ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">I</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Penjualan</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Penjualan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(penjualan)}</td>
              <td className="px-4 py-3" />
            </tr>

            {/* ── II. BIAYA LANGSUNG ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">II</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Langsung</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}/wbs`)}
                  className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                >
                  Details <ArrowSquareOutIcon size={14} />
                </button>
              </td>
            </tr>
            <tr
              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/data-management/resource?resource_category=Material`)}
            >
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Material</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(material)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr
              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/data-management/resource?resource_category=Upah`)}
            >
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Upah</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(upah)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr
              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/data-management/resource?resource_category=Alat`)}
            >
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Alat</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(alat)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr
              className="hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/data-management/resource?resource_category=Subkon`)}
            >
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Subkon</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(subkon)}</td>
              <td className="px-4 py-3" />
            </tr>

            {/* ── III. BIAYA TAK LANGSUNG ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">III</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Tak Langsung</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}/${phaseId}/indirect-cost-eval`)}
                  className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                >
                  Details <ArrowSquareOutIcon size={14} />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Fasilitas</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(fasilitas)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Sekretariat</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(sekretariat)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Kendaraan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(kendaraan)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Personalia</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(personalia)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Keuangan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(keuangan)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Umum</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(umum)}</td>
              <td className="px-4 py-3" />
            </tr>

            {/* ── IV. BIAYA LAIN-LAIN ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">IV</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Lain-Lain</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Biaya Pemeliharaan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(biayaPemeliharaan)}</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Risiko</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(risiko)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>

          {/* ── Footer / Summary ── */}
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t border-gray-200">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL BIAYA (II+III+IV)</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiaya)}</td>
              <td className="px-4 py-4" />
            </tr>
            <tr className="bg-[#F9FAFB] border-t border-gray-100">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">BEBAN PPH FINAL</td>
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(bebanPphFinal)}</td>
              <td className="px-4 py-4" />
            </tr>
            <tr className="bg-[#F9FAFB] border-t border-gray-100">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">LABA KOTOR (I-V)</td>
              <td className="px-4 py-4">
                <span className={`text-[14px] font-bold ${labaKotor >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(labaKotor)}</span>
              </td>
              <td className="px-4 py-4" />
            </tr>
            <tr className="bg-[#F9FAFB] border-t border-gray-100">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">LSP</td>
              <td className="px-4 py-4">
                <span className={`text-[14px] font-bold ${lsp >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(lsp)}</span>
              </td>
              <td className="px-4 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

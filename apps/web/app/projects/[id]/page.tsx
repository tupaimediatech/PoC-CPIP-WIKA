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
        onExport={async () => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: "#F9FAFB" }}>
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Uraian</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Realisasi</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">%</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {/* ── I. PENJUALAN ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">I</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Penjualan</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{formatCurrency(penjualan).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">100.00 %</td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Penjualan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(penjualan)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>

            {/* ── II. BIAYA LANGSUNG ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">II</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Langsung</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiayaLangsung).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{biayaLangsung.percentage?.toFixed(2) ?? "0.00"} %</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}/wbs`)}
                  className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                >
                  Details <ArrowSquareOutIcon size={14} />
                </button>
              </td>
            </tr>
            {[
              { label: "Material", val: material },
              { label: "Upah", val: upah },
              { label: "Alat", val: alat },
              { label: "Subkon", val: subkon },
            ].map((item) => (
              <tr
                key={item.label}
                className="group hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
                onClick={() =>
                  router.push(
                    `/data-management/resource?from_level3=true&resource_category=${item.label}&project_name=${encodeURIComponent(data.project_name)}&total_harsat=${item.val}&project_id=${projectId}`,
                  )
                }
              >
                <td className="px-6 py-3" />
                <td className="px-4 py-3 text-[14px] font-medium text-gray-700 group-hover:text-primary-blue flex items-center gap-2">
                  {item.label}
                  <ArrowSquareOutIcon size={14} className="opacity-0 group-hover:opacity-100 text-primary-blue transition-all" />
                </td>
                <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(item.val)}</td>
                <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
                <td className="px-4 py-3 text-[12px] text-primary-blue font-medium opacity-0 group-hover:opacity-100 text-right">View Resource</td>
              </tr>
            ))}

            {/* ── III. BIAYA TAK LANGSUNG ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">III</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Tak Langsung</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiayaTakLangsung).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{biayaTakLangsung.percentage?.toFixed(2) ?? "0.00"} %</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => router.push(`/projects/${projectId}/${phaseId}/indirect-cost-eval`)}
                  className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                >
                  Details <ArrowSquareOutIcon size={14} />
                </button>
              </td>
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Fasilitas</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(fasilitas)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Sekretariat</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(sekretariat)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Kendaraan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(kendaraan)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Personalia</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(personalia)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Keuangan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(keuangan)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Umum</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(umum)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>

            {/* ── IV. BIAYA LAIN-LAIN ── */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">IV</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">Biaya Lain-Lain</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiayaLainLain).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{biayaLainLain.percentage?.toFixed(2) ?? "0.00"} %</td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Biaya Pemeliharaan</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(biayaPemeliharaan)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
            <tr className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
              <td className="px-6 py-3" />
              <td className="px-4 py-3 text-[14px] font-medium text-gray-700">Risiko</td>
              <td className="px-4 py-3 text-[14px] text-gray-700">{formatCurrency(risiko)}</td>
              <td className="px-4 py-3 text-[14px] text-gray-400">-</td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>

          {/* ── Footer / Summary ── */}
          <tfoot className="border-t-2 border-gray-100">
            {/* V. TOTAL BIAYA */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">V</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">TOTAL BIAYA (II+III+IV)</td>
              <td className="px-4 py-3 text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiaya).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">
                {penjualan > 0 ? ((totalBiaya / penjualan) * 100).toFixed(2) : "0.00"} %
              </td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>

            {/* VI. LABA KOTOR */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">VI</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">LABA KOTOR (I-V)</td>
              <td className="px-4 py-3">
                <span className={`text-[14px] font-bold ${labaKotor >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(labaKotor).replace("Rp", "RP ")}
                </span>
              </td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">
                {penjualan > 0 ? ((labaKotor / penjualan) * 100).toFixed(2) : "0.00"} %
              </td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>

            {/* VII. BEBAN PPH FINAL */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">VII</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">BEBAN PPH FINAL</td>
              <td className="px-4 py-3 text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(bebanPphFinal).replace("Rp", "RP ")}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">
                {penjualan > 0 ? ((bebanPphFinal / penjualan) * 100).toFixed(2) : "0.00"} %
              </td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>

            {/* VIII. LSP */}
            <tr className="bg-[#F3F6FD]">
              <td className="px-6 py-3 text-[13px] font-bold text-[#1B1C1F]">VIII</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">LSP</td>
              <td className="px-4 py-3">
                <span className={`text-[14px] font-bold ${lsp >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(lsp).replace("Rp", "RP ")}
                </span>
              </td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1B1C1F]">{penjualan > 0 ? ((lsp / penjualan) * 100).toFixed(2) : "0.00"} %</td>
              <td className="px-4 py-3 text-[13px] font-semibold text-gray-400">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

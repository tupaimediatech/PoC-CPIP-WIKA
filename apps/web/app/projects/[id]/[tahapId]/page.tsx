"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { periodApi } from "@/lib/api";
import type { WorkItemLevel4, WorkItemLevel4ListResponse } from "@/types/project";
import { formatCurrency } from "@/lib/utils";

function formatSatuan(s: string | null | undefined): React.ReactNode {
  if (!s) return "-";
  // Split on digit sequences: "m2" → ["m", "2"], "cm3" → ["cm", "3"]
  const parts = s.split(/(\d+)/);
  return parts.map((part, i) => (/^\d+$/.test(part) ? <sup key={i}>{part}</sup> : part));
}

export default function Level4Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;
  const tahapId = Number(params.tahapId);

  const [data, setData] = useState<WorkItemLevel4ListResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    periodApi
      .workItems(tahapId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tahapId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  if (!data) return <div className="p-8 text-gray-400">No data found</div>;

  const totalBiaya = data.items.reduce((sum, i) => sum + i.totalBiaya, 0);

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 4 Harsat Per Sumber Daya - Tahap ${data.tahap}`}
        pills={[
          { label: "Tahap", value: data.tahap },
          { label: "Realisasi Biaya", value: formatCurrency(data.rabInternal) },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Item Sumber Daya</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Volume</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Satuan</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Harsat Internal</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Total Biaya</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.items.map((item: any, idx: number) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">{item.name || "-"}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{item.volume ? Number(item.volume).toLocaleString("id-ID") : "-"}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{formatSatuan(item.unit || item.satuan)}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700">
                  {item.harsatInternal || item.internalPrice ? formatCurrency(item.harsatInternal ?? item.internalPrice) : "-"}
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{formatCurrency(item.totalBiaya)}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/${tahapId}/${item.id}`)}
                    className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                  >
                    Details <ArrowSquareOutIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t border-gray-200">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">TOTAL</td>
              <td colSpan={3} />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">{formatCurrency(totalBiaya)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

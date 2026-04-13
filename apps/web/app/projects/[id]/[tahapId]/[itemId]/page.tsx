"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { workItemApi } from "@/lib/api";
import type {
  MaterialLogLevel5,
  WorkItemDetailResponse,
} from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function parseIdn(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return isFinite(value) ? value : null;

  const core = value.replace(/[^0-9.,-]/g, "").trim();
  if (!core) return null;

  const lastDot = core.lastIndexOf(".");
  const lastComma = core.lastIndexOf(",");

  let normalized: string;
  if (lastDot > 0 && lastComma > 0) {
    normalized =
      lastDot > lastComma
        ? core.replace(/,/g, "")
        : core.replace(/\./g, "").replace(",", ".");
  } else if (lastComma > 0) {
    const afterComma = core.slice(lastComma + 1);
    normalized =
      afterComma.length === 3 && core.indexOf(",") === core.lastIndexOf(",")
        ? core.replace(/,/g, "")
        : core.replace(",", ".");
  } else if (lastDot > 0) {
    const dotCount = (core.match(/\./g) ?? []).length;
    const afterDot = core.slice(lastDot + 1);
    normalized =
      dotCount > 1 || afterDot.length === 3 ? core.replace(/\./g, "") : core;
  } else {
    normalized = core;
  }

  const num = parseFloat(normalized);
  return isFinite(num) ? num : null;
}

function formatCompact(value: number | string | null | undefined): string {
  const num = parseIdn(value);
  if (num == null) return "-";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000)
    return `${sign}${(abs / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (abs >= 1_000_000_000)
    return `${sign}${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1_000_000)
    return `${sign}${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
  return `${sign}${abs.toLocaleString("id-ID")}`;
}

export default function Level4DetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; tahapId: string; itemId: string }>();
  const projectId = params.id;
  const itemId = Number(params.itemId);

  const [data, setData] = useState<WorkItemDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      // In demo mode simulate the consolidated response from mock data
      const level4 = mockData.level4 as unknown as {
        tahap: string;
        rabInternal: number;
      };
      const materials = (mockData.level5 as MaterialLogLevel5[]).filter(
        (m) => !m.is_discount,
      );
      setData({
        tahap: level4.tahap ?? "-",
        rabInternal: level4.rabInternal ?? 0,
        workItem: {
          id: itemId,
          name: level4.tahap ?? "-",
          item_no: null,
          volume: null,
          satuan: null,
        },
        materials,
      });
      setLoading(false);
      return;
    }

    workItemApi
      .detail(itemId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-gray-400">Item tidak ditemukan</div>;
  }

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 4B Harsat Per Sumber Daya — ${data.workItem.name}`}
        pills={[
          { label: "Tahap", value: data.tahap },
          { label: "RAB Internal", value: formatCompact(data.rabInternal) },
        ]}
        onExport={() => {}}
      />

      {data.materials.length === 0 ? (
        <div className="border border-gray-100 rounded-xl p-8 text-center mb-8 text-gray-500 text-[14px]">
          Tidak ada material atau vendor yang terhubung ke item ini.
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-16">
                  #
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Item Sumber Daya
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Satuan
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Harsat Internal
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Total Biaya
                </th>
                <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.materials.map((material, idx) => {
                const hargaSatuan = parseIdn(material.kontrak.hargaSatuan);
                const totalBiaya =
                  material.volume != null && hargaSatuan != null
                    ? material.volume * hargaSatuan
                    : parseIdn(material.kontrak.nilaiKontrak);

                return (
                  <tr
                    key={material.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-[14px] text-gray-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">
                      {material.material_type ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-[14px] text-gray-600">
                      {material.volume != null
                        ? material.volume.toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-[14px] text-gray-600">
                      {material.satuan ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-[14px] font-medium text-gray-800">
                      {formatCompact(hargaSatuan)}
                    </td>
                    <td className="px-4 py-4 text-[14px] font-medium text-gray-800">
                      {formatCompact(totalBiaya)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() =>
                          router.push(
                            `/projects/${projectId}/${params.tahapId}/${itemId}/${material.id}`,
                          )
                        }
                        className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                      >
                        Details <ArrowSquareOutIcon size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BackButton
        label="Back to Level 4"
        href={`/projects/${projectId}/${params.tahapId}`}
      />
    </div>
  );
}

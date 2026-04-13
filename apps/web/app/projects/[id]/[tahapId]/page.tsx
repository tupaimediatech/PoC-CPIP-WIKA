"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowSquareOutIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { wbsApi } from "@/lib/api";
import type {
  WorkItemLevel4,
  WorkItemLevel4ListResponse,
} from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatRupiah(value: number | undefined | null): string {
  if (value === undefined || value === null) return "-";
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} jt`;
  return value.toLocaleString("id-ID");
}

export default function Level4Page() {
  const router = useRouter();
  const params = useParams<{ id: string; tahapId: string }>();
  const projectId = params.id;
  const tahapId = Number(params.tahapId);

  const [data, setData] = useState<WorkItemLevel4ListResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setData(mockData.level4 as unknown as WorkItemLevel4ListResponse["data"]);
      setLoading(false);
      return;
    }
    wbsApi
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

  // Extract level-1 items (children of level-0 categories)
  const level1Items: WorkItemLevel4[] = data.items.flatMap(
    (cat) => cat.children ?? [],
  );

  // Sum total from all leaf items (level-2 if exists, else level-1)
  function sumLeafBiaya(items: WorkItemLevel4[]): number {
    return items.reduce((sum, i) => {
      if (i.is_total_row) return sum;
      if (!i.children || i.children.length === 0) {
        return sum + (i.totalCost ?? i.totalBiaya ?? 0);
      }
      return sum + sumLeafBiaya(i.children);
    }, 0);
  }

  const totalBiaya = sumLeafBiaya(level1Items);

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 4A Harsat Per Sumber Daya — ${data.tahap}`}
        pills={[
          { label: "Tahap", value: data.tahap },
          { label: "RAB Internal", value: formatRupiahShort(data.rabInternal) },
        ]}
        onExport={() => {}}
      />

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider w-16">
                #
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Item Sumber Daya
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Volume
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Satuan
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Harsat Internal
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Total Biaya
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500  tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {level1Items
              .filter((item) => !item.is_total_row)
              .map((item, itemIdx) => {
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <Fragment key={item.id}>
                    {/* Level-1 section header */}
                    <tr className="bg-[#F4F6FA] border-t border-gray-200">
                      <td className="px-6 py-3 text-[13px] text-gray-500 font-medium">
                        {itemIdx + 1}
                      </td>
                      <td className="px-4 py-3" colSpan={5}>
                        <span className="text-[13px] font-bold text-[#1B1C1F] uppercase tracking-wide">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Details on level-1 if it has NO children */}
                        {!hasChildren && (
                          <button
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}/${tahapId}/${item.id}`,
                              )
                            }
                            className="flex items-center gap-1 text-primary-blue text-[13px] font-medium hover:underline"
                          >
                            Details <ArrowSquareOutIcon size={14} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Level-2 leaf rows */}
                    {hasChildren &&
                      (item.children ?? [])
                        .filter((child) => !child.is_total_row)
                        .map((child, childIdx) => {
                          return (
                            <tr
                              key={child.id}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td
                                className="py-4 text-[14px] text-gray-500 font-medium"
                                style={{
                                  paddingLeft: "40px",
                                  paddingRight: "8px",
                                }}
                              >
                                {childIdx + 1}
                              </td>
                              <td className="px-4 py-4 text-[14px] font-medium text-[#1B1C1F]">
                                {child.name}
                              </td>
                              <td className="px-4 py-4 text-[14px] text-gray-600">
                                {child.volume != null
                                  ? child.volume.toLocaleString("id-ID")
                                  : "-"}
                              </td>
                              <td className="px-4 py-4 text-[14px] text-gray-600">
                                {child.unit ?? child.satuan ?? "-"}
                              </td>
                              <td className="px-4 py-4 text-[14px] text-gray-600">
                                {formatRupiah(
                                  child.internalPrice ?? child.harsatInternal,
                                )}
                              </td>
                              <td className="px-4 py-4 text-[14px] font-medium text-gray-800">
                                {formatRupiah(
                                  child.totalCost ?? child.totalBiaya,
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/projects/${projectId}/${tahapId}/${child.id}`,
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
                  </Fragment>
                );
              })}
          </tbody>
          <tfoot>
            <tr className="bg-[#F9FAFB] border-t-2 border-gray-200">
              <td className="px-6 py-4" />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">
                TOTAL
              </td>
              <td colSpan={3} />
              <td className="px-4 py-4 text-[14px] font-bold text-[#1B1C1F]">
                {formatRupiah(totalBiaya)}
              </td>
              <td colSpan={1} />
            </tr>
          </tfoot>
        </table>
      </div>

      <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
    </div>
  );
}

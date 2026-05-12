"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";

import DataTable, { Column } from "@/components/ui/DataTable";

import { periodApi } from "@/lib/api";

import type { WorkItemLevel4, WorkItemLevel4ListResponse } from "@/types/project";

import { formatCurrency } from "@/lib/utils";

function formatSatuan(s: string | null | undefined): React.ReactNode {
  if (!s) return "-";

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

  const items = data?.items || [];

  /**
   * TOTAL
   */
  const totalBiaya = items.reduce((sum, item) => sum + item.totalBiaya, 0);

  /**
   * COLUMNS
   */
  const columns: Column<WorkItemLevel4>[] = useMemo(
    () => [
      {
        key: "id_resource",
        title: "ID Resource",
        sortable: true,
        searchable: true,
        className: "font-medium text-gray-600",
      },

      {
        key: "name",
        title: "Item Sumber Daya",
        sortable: true,
        searchable: true,
        className: "font-semibold text-[#1B1C1F]",

        render: (value) => value || "-",
      },

      {
        key: "volume",
        title: "Volume",
        sortable: true,

        render: (value) => (value ? Number(value).toLocaleString("id-ID") : "-"),
      },

      {
        key: "unit",
        title: "Satuan",
        sortable: true,
        searchable: true,

        render: (_, row) => formatSatuan(row.unit || row.satuan),
      },

      {
        key: "resource_category",
        title: "Kategori Resource",
        sortable: true,
        searchable: true,

        render: (value) => value || "-",
      },

      {
        key: "harsatInternal",
        title: "Harsat Internal",
        sortable: true,

        render: (_, row) => {
          const value = row.harsatInternal ?? row.internalPrice;

          return value ? formatCurrency(value) : "-";
        },
      },

      {
        key: "totalBiaya",
        title: "Total Biaya",
        sortable: true,

        render: (value) => formatCurrency(value),
      },
    ],
    [],
  );

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 5 Harsat Per Sumber Daya - Tahap ${data?.tahap ?? "-"}`}
        pills={[
          {
            label: "Tahap",
            value: data?.tahap ?? "-",
          },

          {
            label: "Realisasi Biaya",
            value: formatCurrency(data?.rabInternal ?? 0),
          },
        ]}
        onExport={() => {}}
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No data found"
        actions={(row) => (
          <button
            onClick={() => router.push(`/projects/${projectId}/${tahapId}/direct-cost/${row.id}`)}
            className="
              inline-flex
              items-center
              gap-1
              text-[13px]
              font-medium
              text-blue-600
              hover:underline
            "
          >
            Details
            <ArrowSquareOutIcon size={14} />
          </button>
        )}
        footer={{
          id_resource: "",
          name: "TOTAL",
          volume: "",
          unit: "",
          resource_category: "",

          harsatInternal: <span className="font-bold">{formatCurrency(totalBiaya)}</span>,

          totalBiaya: "",
        }}
      />

      <div className="mt-8">
        <BackButton label="Back to Level 4" href={`/projects/${projectId}/wbs`} />
      </div>
    </div>
  );
}

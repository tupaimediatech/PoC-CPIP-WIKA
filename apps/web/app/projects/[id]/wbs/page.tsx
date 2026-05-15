"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ArrowDownIcon, ArrowSquareOutIcon, ArrowUpIcon } from "@phosphor-icons/react";

import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";

import DataTable, { Column } from "@/components/ui/DataTable";

import { projectApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Phase {
  id: number;
  name_of_work_phase: string;
  bq_external: number;
  actual_costs: number;
  deviasi_pct: number;
}

export default function Level3Page() {
  const router = useRouter();
  const params = useParams();

  const projectId = Number(params.id);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi
      .periods(projectId)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const phases: Phase[] = data?.phases || [];

  /**
   * TOTAL FOOTER
   */
  const totalBq = phases.reduce((acc, curr) => acc + (curr.bq_external || 0), 0);

  const totalRealized = phases.reduce((acc, curr) => acc + (curr.actual_costs || 0), 0);

  const totalDeviasiPct = totalBq > 0 ? ((totalBq - totalRealized) / totalBq) * 100 : 0;

  /**
   * COLUMNS
   */
  const columns: Column<Phase>[] = useMemo(
    () => [
      {
        key: "id",
        title: "#",
        sortable: true,
        render: (_, __, index) => <span className="font-medium text-gray-600">{index + 1}</span>,
      },

      {
        key: "name_of_work_phase",
        title: "Nama Tahap Pekerjaan",
        sortable: true,
        searchable: true,
        className: "font-semibold text-[#1B1C1F]",
      },

      {
        key: "bq_external",
        title: "BQ External",
        sortable: true,
        render: (value) => formatCurrency(value),
      },

      {
        key: "actual_costs",
        title: "Realisasi Biaya",
        sortable: true,
        render: (value) => formatCurrency(value),
      },

      {
        key: "deviasi_pct",
        title: "Deviasi (%)",
        sortable: true,

        render: (value) => (
          <div
            className={`
              inline-flex
              items-center
              gap-1
              font-bold
              ${value >= 0 ? "text-green-600" : "text-red-600"}
            `}
          >
            {value >= 0 ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />}
            {Math.abs(value).toFixed(1)}%
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 4 WBS Overview - ${data?.project_name ?? "-"}`}
        pills={[
          {
            label: "SBU",
            value: data?.sbu ?? "-",
          },
          {
            label: "Project Owner",
            value: data?.owner ?? "-",
          },
          {
            label: "Contract Type",
            value: data?.contract_type ?? "-",
          },
        ]}
        onExport={async () => {}}
      />

      <DataTable
        columns={columns}
        data={phases}
        loading={loading}
        emptyMessage="No data found"
        actions={(row) => (
          <button
            onClick={() => router.push(`/projects/${projectId}/${row.id}/direct-cost`)}
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
          id: "",
          name_of_work_phase: "TOTAL",
          bq_external: formatCurrency(totalBq),
          actual_costs: formatCurrency(totalRealized),

          deviasi_pct: <span className={`font-bold ${totalDeviasiPct >= 0 ? "text-green-600" : "text-red-600"}`}>{totalDeviasiPct.toFixed(1)}%</span>,
        }}
      />

      <div className="mt-8">
        <BackButton label="Back to Level 3" href={`/projects/${projectId}`} />
      </div>
    </div>
  );
}

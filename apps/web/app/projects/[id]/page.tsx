"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowSquareOutIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import PageHeader from "@/components/analytics/PageHeader";
import BackButton from "@/components/analytics/BackButton";
import { projectApi } from "@/lib/api";
import type { ProjectPhase, ProjectPhaseListResponse } from "@/types/project";
import { DEMO_MODE } from "@/lib/demo";
import mockData from "@/data/mock-data.json";

function formatCompact(value: number | null | undefined): string {
  if (value == null) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
  }
  return `${sign}${abs.toLocaleString("id-ID")}`;
}

interface Level3Data {
  project_name: string;
  sbu: ProjectPhaseListResponse["data"]["sbu"];
  owner: ProjectPhaseListResponse["data"]["owner"];
  contract_type: ProjectPhaseListResponse["data"]["contract_type"];
  phases: ProjectPhase[];
}

export default function Level3Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [data, setData] = useState<Level3Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const level3meta = mockData.level3;
      setData({
        project_name: level3meta.project_name,
        sbu: level3meta.sbu,
        owner: level3meta.owner,
        contract_type: level3meta.contract_type,
        phases: level3meta.phases as ProjectPhase[],
      });
      setLoading(false);
      return;
    }

    projectApi
      .periods(projectId)
      .then((res) => {
        setData({
          project_name: res.data.project_name,
          sbu: res.data.sbu,
          owner: res.data.owner,
          contract_type: res.data.contract_type,
          phases: res.data.phases,
        });
      })
      .catch(console.error)
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

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader
        title={`Level 3 WBS Overview — ${data.project_name}`}
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
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 tracking-wider w-16">
                #
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 tracking-wider">
                Nama Tahap Pekerjaan
              </th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 tracking-wider">
                BQ External
              </th>
              <th className="px-4 py-4 text-right text-[12px] font-bold text-gray-500 tracking-wider">
                RAB Internal
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 tracking-wider">
                Deviasi
              </th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.phases.map((phase, idx) => {
              const deviasiPos = phase.deviasi >= 0;
              const hasDeviasi = phase.deviasi !== 0;

              return (
                <tr
                  key={phase.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-[14px] text-gray-500 font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F]">
                    {phase.name}
                  </td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 text-right font-medium">
                    {formatCompact(phase.bqExternal)}
                  </td>
                  <td className="px-4 py-4 text-[14px] text-gray-700 text-right font-medium">
                    {formatCompact(phase.rabInternal)}
                  </td>
                  <td className="px-4 py-4">
                    {hasDeviasi ? (
                      <div
                        className={`inline-flex items-center gap-1 text-[13px] font-semibold ${
                          deviasiPos ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {deviasiPos ? (
                          <ArrowUpIcon size={12} />
                        ) : (
                          <ArrowDownIcon size={12} />
                        )}
                        {formatCompact(Math.abs(phase.deviasi))}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-[13px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() =>
                        router.push(`/projects/${projectId}/${phase.id}`)
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
      <BackButton label="Back to Projects" href="/projects" />
    </div>
  );
}

"use client";

import { TrendUpIcon, TrendDownIcon } from "@phosphor-icons/react";
import type { ParetoItem } from "@/types/project";

interface Props {
  profitability: ParetoItem[];
  overrun: ParetoItem[];
}

export default function ParetoTables({ profitability, overrun }: Props) {
  return (
    <div className="bg-white flex gap-8 w-full" style={{ padding: "18px 32px" }}>
      <ParetoTable
        title="Project Profitability"
        titleColor="text-green-600"
        icon={<TrendUpIcon size={16} className="text-green-600" />}
        data={profitability}
      />
      <ParetoTable title="Critical Over Run" titleColor="text-red-600" icon={<TrendDownIcon size={16} className="text-red-600" />} data={overrun} />
    </div>
  );
}

function ParetoTable({ title, titleColor, data }: { title: string; titleColor: string; icon: React.ReactNode; data: ParetoItem[] }) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[16px] font-bold text-[#1B1C1F]">Pareto Top 10</span>
        <span className="text-[16px] font-bold text-[#1B1C1F]">:</span>
        <span className={`text-[16px] font-bold ${titleColor}`}>{title}</span>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-xl">
        {data.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-[13px]">No data available</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100" style={{ backgroundColor: "#F9FAFB" }}>
                <th className="px-4 py-3 text-left text-[12px] font-bold text-gray-500 w-10">#</th>
                <th className="px-4 py-3 text-left text-[12px] font-bold text-gray-500">Project Name</th>
                <th className="px-4 py-3 text-right text-[12px] font-bold text-gray-500">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:transition-colors" style={{ backgroundColor: "rgba(249,250,251,0.5)" }}>
                  <td className="px-4 py-3 text-[13px] text-gray-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3 text-[13px] text-[#1B1C1F] font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-[13px] text-[#1B1C1F] font-medium text-right">{item.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

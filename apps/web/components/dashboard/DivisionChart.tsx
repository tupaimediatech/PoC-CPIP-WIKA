"use client";

import { ReadCvLogoIcon, MoneyWavyIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatKpi } from "@/lib/utils";
import type { DashboardSummaryData } from "@/types/dashboard";

type Props = {
  data: DashboardSummaryData; // ← satu-satunya perubahan dari SummaryResponse
};

function MiniKpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between w-full" style={{ height: "120px" }}>
      <div className="flex flex-col gap-1">
        <p className="text-[14px] text-gray-800 font-medium">{sub}</p>
        <div className="flex items-center gap-2">
          <div className="flex flex-shrink-0 items-center justify-center bg-primary-blue rounded-md" style={{ width: "26px", height: "26px" }}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-gray-500">{label}</span>
        </div>
      </div>
      <h3 className="text-[24px] font-bold text-[#1B1C1F]">{value}</h3>
    </div>
  );
}

const CHART_H = 280;
const MAX = 1.0;
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

interface Tooltip {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  value: string;
  color: string;
}

function getSummaryDescription(divisions: [string, { avg_cpi: number; avg_spi: number }][]) {
  if (divisions.length === 0) {
    return "No division data available yet. Upload project data to see insights.";
  }

  const sortedByCpi = [...divisions].sort((a, b) => b[1].avg_cpi - a[1].avg_cpi);
  const sortedBySpi = [...divisions].sort((a, b) => b[1].avg_spi - a[1].avg_spi);

  const bestCpi = sortedByCpi[0][0];
  const worstCpi = sortedByCpi[sortedByCpi.length - 1][0];
  const bestSpi = sortedBySpi[0][0];
  const worstSpi = sortedBySpi[sortedBySpi.length - 1][0];

  const costPhrase = `${bestCpi} outperforms ${worstCpi}, especially in cost control.`;
  const allBehindSchedule = divisions.every(([, d]) => d.avg_spi < 1.0);
  const someBehindSchedule = divisions.some(([, d]) => d.avg_spi < 1.0);

  let schedulePhrase = "";
  if (allBehindSchedule) {
    schedulePhrase = `Both divisions are behind schedule, but the delay is more critical in ${worstSpi}.`;
  } else if (someBehindSchedule) {
    schedulePhrase = `${worstSpi} is the most delayed division while others are closer to schedule.`;
  } else {
    schedulePhrase = `All divisions are on schedule.`;
  }

  return `${costPhrase} ${schedulePhrase}`;
}

export default function DivisionChart({ data }: Props) {
  const router = useRouter();
  const divisions = Object.entries(data.by_division);
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
    color: "",
  });

  if (divisions.length === 0) return null;

  function showTooltip(e: React.MouseEvent, label: string, value: string, color: string) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label,
      value,
      color,
    });
  }

  function moveTooltip(e: React.MouseEvent) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip((t) => ({
      ...t,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
  }

  function hideTooltip() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  return (
    <div className="bg-white" style={{ padding: "18px 32px" }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">Division Performance Comparison</h2>
      </div>

      <div
        className="flex items-stretch"
        style={{
          gap: "33px",
        }}
      >
        <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-2xl">
          {/* Legend */}
          <div className="flex items-center gap-8 self-center">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#CA6939]" />
              <span className="text-[13px] font-medium text-gray-600">Cost Performance Index</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#EBAC2F]" />
              <span className="text-[13px] font-medium text-gray-600">Schedule Performance Index</span>
            </div>
          </div>

          <div className="relative w-full h-[350px] flex gap-4">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-between text-[13px] text-gray-400 font-medium pb-8">
              <span>1.0</span>
              <span>0.8</span>
              <span>0.6</span>
              <span>0.4</span>
              <span>0.2</span>
              <span>0</span>
            </div>

            {/* Chart Area */}
            <div className="flex-1 flex flex-col relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-8 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-full border-t border-[#F3F4F6]" />
                ))}
              </div>

              {/* Bars Container */}
              <div className="flex-1 flex justify-around items-end px-12 relative z-10 pb-8">
                {divisions.map(([division, divData]) => (
                  <div key={division} className="flex flex-col items-center group">
                    <div className="flex items-end gap-5 h-full">
                      {/* CPI Bar (Infrastructure/Building) */}
                      <div className="relative w-[52px] h-[220px] bg-[#F8F8F8] rounded-t-[16px] flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#CA6939] rounded-t-[16px] transition-all duration-700"
                          style={{ height: `${(divData.avg_cpi / 1.0) * 100}%` }}
                        />
                      </div>

                      {/* SPI Bar (Infrastructure/Building) */}
                      <div className="relative w-[52px] h-[220px] bg-[#F8F8F8] rounded-t-[16px] flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#EBAC2F] rounded-t-[16px] transition-all duration-700"
                          style={{ height: `${(divData.avg_spi / 1.0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* X-Axis Label */}
                    <span className="absolute bottom-0 text-[14px] font-semibold text-gray-500 mt-4">{division}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col flex-1 min-w-0"
          style={{
            gap: "18px",
          }}
        >
          {divisions.map(([division, divData]) => (
            <div key={division}>
              <div className="grid grid-cols-2 gap-4.5 w-full">
                <div onClick={() => router.push(`/projects/cpi/${division.toLowerCase()}`)} className="cursor-pointer group">
                  <MiniKpiCard label="Cost Performance Index" value={formatKpi(divData.avg_cpi)} sub={division} icon={MoneyWavyIcon} />
                  <div className="hidden group-hover:block text-[10px] text-blue-600 font-medium px-2">Click to see detail →</div>
                </div>
                <div onClick={() => router.push(`/projects/spi/${division.toLowerCase()}`)} className="cursor-pointer group">
                  <MiniKpiCard label="Schedule Performance Index" value={formatKpi(divData.avg_spi)} sub={division} icon={CalendarBlankIcon} />
                  <div className="hidden group-hover:block text-[10px] text-blue-600 font-medium px-2">Click to see detail →</div>
                </div>
              </div>
            </div>
          ))}

          <div
            className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col min-h-0"
            style={{
              width: "100%",
              flexGrow: 1,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center bg-primary-blue rounded-md" style={{ width: "26px", height: "26px" }}>
                <ReadCvLogoIcon size={14} className="text-white" />
              </div>
              <span className="text-[16px] font-bold text-[#1B1C1F]">Summary</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-[13px] leading-relaxed text-gray-600">{getSummaryDescription(divisions)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

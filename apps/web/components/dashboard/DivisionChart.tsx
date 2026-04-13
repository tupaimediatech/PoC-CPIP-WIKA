"use client";

import { ReadCvLogoIcon, MoneyWavyIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import { useState, useRef } from "react";
import { formatKpi } from "@/lib/utils";
import type { SummaryResponse } from "@/types/project";

type Props = {
  data: SummaryResponse;
};

function MiniKpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between w-full"
      style={{ height: "120px" }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[14px] text-gray-800 font-medium">{sub}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-primary-blue rounded-md" style={{ width: "26px", height: "26px" }}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold text-gray-500">
            {label}
          </span>
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

export default function DivisionChart({ data }: Props) {
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

  function showTooltip(
    e: React.MouseEvent,
    label: string,
    value: string,
    color: string,
  ) {
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

  function moveTooltip(
    e: React.MouseEvent,
  ) {
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
    <div
      className="bg-white"
      style={{ padding: "18px 32px" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[18px] font-bold text-[#1B1C1F]">
          Division Performance Comparison
        </h2>
      </div>

      <div
        className="flex items-start"
        style={{
          gap: "33px",
        }}
      >
        <div
          className="flex flex-col items-center gap-3 flex-1 min-w-0"
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#CA6939]" />
              <span className="text-[12px] font-semibold text-gray-500">
                Cost Performance Index
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EBAC2F]" />
              <span className="text-[12px] font-semibold text-gray-500">
                Schedule Performance Index
              </span>
            </div>
          </div>

          <div
            ref={chartRef}
            className="relative bg-white border border-gray-100 rounded-2xl w-full"
            style={{
              height: "380px",
              padding: "24px 28px 20px 16px",
            }}
          >
            {tooltip.visible && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}
              >
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-42.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tooltip.color }}
                    />
                    <span className="text-[11px] text-gray-400 font-medium">
                      {tooltip.label}
                    </span>
                  </div>
                  <span className="text-[20px] font-bold text-gray-900 leading-none">
                    {tooltip.value}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 h-full">
              <div
                className="relative shrink-0"
                style={{ width: "28px", height: `${CHART_H}px` }}
              >
                {Y_TICKS.map((tick) => (
                  <span
                    key={tick}
                    className="absolute text-[11px] text-gray-400 font-medium leading-none"
                    style={{
                      bottom: `${(tick / MAX) * 100}%`,
                      right: 0,
                      transform: "translateY(50%)",
                    }}
                  >
                    {tick === 0 ? "0" : tick.toFixed(1).replace(/\.0$/, "")}
                  </span>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="relative" style={{ height: `${CHART_H}px` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {Y_TICKS.map((tick) => (
                      <div
                        key={tick}
                        className="absolute w-full"
                        style={{
                          bottom: `${(tick / MAX) * 100}%`,
                          borderTop: `1px solid ${tick === 0 ? "#D1D5DB" : "#F3F4F6"}`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 flex items-end justify-around px-6">
                    {divisions.map(([division, divData]) => (
                      <div key={division} className="flex items-end gap-3">
                        <div
                          className="relative cursor-pointer"
                          style={{
                            width: "52px",
                            height: `${(divData.avg_cpi / MAX) * CHART_H}px`,
                          }}
                          onMouseEnter={(e) =>
                            showTooltip(
                              e,
                              "Cost Performance Index",
                              formatKpi(divData.avg_cpi),
                              "#CA6939",
                            )
                          }
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          <div
                            className="w-full h-full transition-all duration-1000 hover:opacity-90"
                            style={{
                              backgroundColor: "#CA6939",
                              borderRadius: "6px 6px 0 0",
                            }}
                          />
                        </div>

                        <div
                          className="relative cursor-pointer"
                          style={{
                            width: "52px",
                            height: `${(divData.avg_spi / MAX) * CHART_H}px`,
                          }}
                          onMouseEnter={(e) =>
                            showTooltip(
                              e,
                              "Schedule Performance Index",
                              formatKpi(divData.avg_spi),
                              "#EBAC2F",
                            )
                          }
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                        >
                          <div
                            className="w-full h-full transition-all duration-1000 hover:opacity-90"
                            style={{
                              backgroundColor: "#EBAC2F",
                              borderRadius: "6px 6px 0 0",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-around px-6 pt-3">
                  {divisions.map(([division]) => (
                    <span
                      key={division}
                      className="text-[13px] font-medium text-gray-500"
                    >
                      {division}
                    </span>
                  ))}
                </div>
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
              {/* <p className="text-[12px] font-semibold text-gray-500 mb-2">{division}</p> */}
              <div className="grid grid-cols-2 gap-4.5 w-full">
                <MiniKpiCard
                  label="Cost Performance Index"
                  value={formatKpi(divData.avg_cpi)}
                  sub={division}
                  icon={MoneyWavyIcon}
                />
                <MiniKpiCard
                  label="Schedule Performance Index"
                  value={formatKpi(divData.avg_spi)}
                  sub={division}
                  icon={CalendarBlankIcon}
                />
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
              <span className="text-[16px] font-bold text-[#1B1C1F]">
                Summary
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {divisions.length > 0 ? (
                <p className="text-[13px] leading-relaxed text-gray-600">
                  {divisions.map(([name, d]) => `${name}: CPI ${formatKpi(d.avg_cpi)}, SPI ${formatKpi(d.avg_spi)}`).join(" | ")}
                </p>
              ) : (
                <p className="text-[13px] leading-relaxed text-gray-400">
                  No division data available yet. Upload project data to see insights.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

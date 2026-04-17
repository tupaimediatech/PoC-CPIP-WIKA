"use client";

import { useState, useRef, useEffect } from "react";
import { harsatApi } from "@/lib/api";
const FALLBACK_COLORS = ["#CA6939", "#EBAC2F", "#53AD59", "#4EA5DA", "#E76F51", "#2A9D8F"];

const MAX_VALUE = 500;
const Y_TICKS = [0, 100, 200, 300, 400, 500];
const PADDING = { top: 10, right: 20, bottom: 0, left: 0 };

function buildSplinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const parts: string[] = [`M ${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    parts.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return parts.join(" ");
}

interface Tooltip {
  visible: boolean;
  x: number;
  y: number;
  category: string;
  year: string;
  value: number;
  color: string;
}

interface TrendData {
  years: string[];
  categories: { key: string; label: string; color: string }[];
  data: Record<string, number[]>;
}

export default function TrendHarsatUtama() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    category: "",
    year: "",
    value: 0,
    color: "",
  });

  useEffect(() => {
    harsatApi
      .trend()
      .then((res) => {
        if (res.data) {
          const withColors: TrendData = {
            ...res.data,
            categories: res.data.categories.map((cat, i) => ({
              ...cat,
              color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            })),
          };
          setTrendData(withColors);
        }
      })
      .catch(console.error);
  }, []);

  const YEARS = trendData?.years ?? [];
  const CATEGORIES = trendData?.categories ?? [];
  const DATA = trendData?.data ?? {};

  function showTooltip(e: React.MouseEvent, category: string, color: string) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || YEARS.length === 0) return;
    const relX = e.clientX - rect.left;
    const svgLeft = 38;
    const svgRight = rect.width - 16;
    const pct = Math.max(0, Math.min(1, (relX - svgLeft) / (svgRight - svgLeft)));
    const idx = Math.round(pct * (YEARS.length - 1));
    const cat = CATEGORIES.find((c) => c.label === category);
    if (!cat) return;
    const catData = DATA[cat.key] ?? [];
    setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, category, year: YEARS[idx], value: catData[idx] ?? 0, color });
  }

  function hideTooltip() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  const svgW = 600;
  const svgH = 300;
  const chartW = svgW - PADDING.left - PADDING.right;
  const chartH = svgH - PADDING.top - PADDING.bottom;
  const getX = (idx: number) => PADDING.left + (YEARS.length > 1 ? (idx / (YEARS.length - 1)) * chartW : chartW / 2);
  const getY = (val: number) => PADDING.top + chartH - (val / MAX_VALUE) * chartH;

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Trend Harsat Utama</h2>

      <div ref={chartRef} className="relative bg-white border border-gray-100 rounded-2xl" style={{ height: "100%", padding: "24px 16px 30px 16px" }}>
        {/* Kontainer Legend diletakkan di dalam card di bagian atas */}
        {CATEGORIES.length > 0 && (
          <div className="flex items-center justify-center gap-5 mb-6">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[12px] font-semibold text-gray-500">{cat.label}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-gray-400 font-medium mb-2">IDR (Million)</p>

        {YEARS.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[13px]">
            No harsat history data. Add data via POST /api/harsat.
          </div>
        ) : (
          <>
            {tooltip.visible && (
              <div className="absolute z-50 pointer-events-none" style={{ left: tooltip.x + 14, top: tooltip.y - 56 }}>
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.color }} />
                    <p className="text-[11px] text-gray-400 font-medium">
                      {tooltip.category} ({tooltip.year})
                    </p>
                  </div>
                  <span className="text-[18px] font-bold text-gray-900">{tooltip.value}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 h-full">
              <div className="relative shrink-0" style={{ width: "28px", height: `${svgH}px` }}>
                {Y_TICKS.map((tick) => (
                  <span
                    key={tick}
                    className="absolute text-[11px] text-gray-400 font-medium leading-none"
                    style={{ bottom: `${(tick / MAX_VALUE) * 100}%`, right: 0, transform: "translateY(50%)" }}
                  >
                    {tick}
                  </span>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="relative" style={{ height: `${svgH}px` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {Y_TICKS.map((tick) => (
                      <div
                        key={tick}
                        className="absolute w-full"
                        style={{ bottom: `${(tick / MAX_VALUE) * 100}%`, borderTop: `1px solid ${tick === 0 ? "#D1D5DB" : "#F3F4F6"}` }}
                      />
                    ))}
                  </div>

                  <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
                    <defs>
                      {CATEGORIES.map((cat) => (
                        <linearGradient key={cat.key} id={`grad-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={cat.color} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={cat.color} stopOpacity="0.02" />
                        </linearGradient>
                      ))}
                    </defs>

                    {CATEGORIES.map((cat) => {
                      const values = DATA[cat.key] ?? [];
                      const points = values.map((v, i) => ({ x: getX(i), y: getY(v) }));
                      if (points.length === 0) return null;
                      const linePath = buildSplinePath(points);
                      const areaPath = `${linePath} L ${points[points.length - 1].x},${getY(0)} L ${points[0].x},${getY(0)} Z`;
                      return (
                        <g key={cat.key}>
                          <path d={areaPath} fill={`url(#grad-${cat.key})`} />
                          <path d={linePath} fill="none" stroke={cat.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path
                            d={linePath}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="16"
                            className="cursor-pointer"
                            onMouseEnter={(e) => showTooltip(e, cat.label, cat.color)}
                            onMouseMove={(e) => showTooltip(e, cat.label, cat.color)}
                            onMouseLeave={hideTooltip}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex justify-between pt-3">
                  {YEARS.map((year) => (
                    <span key={year} className="text-[10px] font-medium text-gray-400">
                      {year}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

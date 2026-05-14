"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";

// ─── Helpers — identik dengan kode asli ──────────────────────────────────────

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

function niceCeil(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const pow = Math.pow(10, exponent);
  const fraction = value / pow;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * pow;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Props {
  // Sebelumnya: fetch sendiri via harsatApi.trend()
  // Sekarang: terima data dari parent (dashboardApi.get())
  harsatTrend: TrendData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrendHarsatUtama({ harsatTrend }: Props) {
  const chartRef = useRef<HTMLAnchorElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    category: "",
    year: "",
    value: 0,
    color: "",
  });

  // Data langsung dari prop — tidak perlu useState/useEffect
  const YEARS = useMemo(() => harsatTrend?.years ?? [], [harsatTrend]);
  const CATEGORIES = useMemo(() => harsatTrend?.categories ?? [], [harsatTrend]);
  const DATA = useMemo(() => harsatTrend?.data ?? {}, [harsatTrend]);

  const { maxValue, yTicks } = useMemo(() => {
    const all = CATEGORIES.flatMap((c) => DATA[c.key] ?? []);
    const peak = Math.max(0, ...all);
    const max = niceCeil(peak || 10);
    const step = max / 5;
    return {
      maxValue: max,
      yTicks: [0, step, step * 2, step * 3, step * 4, max],
    };
  }, [CATEGORIES, DATA]);

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
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      category,
      year: YEARS[idx],
      value: catData[idx] ?? 0,
      color,
    });
  }

  function hideTooltip() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  const svgW = 600;
  const svgH = 300;
  const chartW = svgW - PADDING.left - PADDING.right;
  const chartH = svgH - PADDING.top - PADDING.bottom;
  const getX = (idx: number) => PADDING.left + (YEARS.length > 1 ? (idx / (YEARS.length - 1)) * chartW : chartW / 2);
  const getY = (val: number) => PADDING.top + chartH - (val / maxValue) * chartH;

  const formatTick = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));

  // ── JSX identik 100% dengan kode asli ────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Trend Harsat Utama</h2>

      <Link
        href="/data-management/resource"
        aria-label="Lihat Database Resource"
        ref={chartRef}
        className="relative block bg-white border border-gray-100 rounded-2xl cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"
        style={{ height: "100%", padding: "24px 16px 30px 16px" }}
      >
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

        <p className="text-[11px] text-gray-400 font-medium mb-2">IDR (Milyar)</p>

        {YEARS.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[13px]">
            Belum ada data harsat. Unggah file lewat Data Ingestion.
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
                  <span className="text-[18px] font-bold text-gray-900">{formatTick(tooltip.value)} M</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 h-full">
              <div className="relative shrink-0" style={{ width: "28px", height: `${svgH}px` }}>
                {yTicks.map((tick) => (
                  <span
                    key={tick}
                    className="absolute text-[11px] text-gray-400 font-medium leading-none"
                    style={{
                      bottom: `${(tick / maxValue) * 100}%`,
                      right: 0,
                      transform: "translateY(50%)",
                    }}
                  >
                    {formatTick(tick)}
                  </span>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="relative" style={{ height: `${svgH}px` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    {yTicks.map((tick) => (
                      <div
                        key={tick}
                        className="absolute w-full"
                        style={{
                          bottom: `${(tick / maxValue) * 100}%`,
                          borderTop: `1px solid ${tick === 0 ? "#D1D5DB" : "#F3F4F6"}`,
                        }}
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
      </Link>
    </div>
  );
}

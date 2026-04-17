"use client";

import { useEffect, useState } from "react";
import { projectApi } from "@/lib/api";
import type { SbuDistributionItem } from "@/types/project";
const COLORS = ["#7DBDB4", "#4EA5DA", "#3573B3", "#F4A261", "#E76F51", "#2A9D8F"];

export default function SebaranSBUChart() {
  const [segments, setSegments] = useState<SbuDistributionItem[]>([]);

  useEffect(() => {
    projectApi
      .sbuDistribution()
      .then((res) => {
        if (res.data.length > 0) setSegments(res.data);
      })
      .catch(console.error);
  }, []);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-w-0">
        <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Sebaran SBU Project</h2>
        <div className="bg-white border border-gray-100 rounded-2xl flex items-center justify-center w-full h-full">
          <span className="text-gray-400 text-[13px]">No SBU data available</span>
        </div>
      </div>
    );
  }

  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const maxValue = Math.max(...segments.map((s) => s.value));
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxOuterR = 130;
  const innerR = 30;
  const sliceAngle = 360 / segments.length;

  const arcs = segments.map((seg, i) => ({
    ...seg,
    color: COLORS[i % COLORS.length],
    startAngle: -90 + i * sliceAngle,
    sweepAngle: sliceAngle,
    outerR: innerR + (seg.value / maxValue) * (maxOuterR - innerR),
    pct: seg.value / total,
  }));

  function polarToCartesian(r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startAngle: number, sweepAngle: number, outerRadius: number) {
    const outerStart = polarToCartesian(outerRadius, startAngle);
    const outerEnd = polarToCartesian(outerRadius, startAngle + sweepAngle);
    const innerStart = polarToCartesian(innerR, startAngle + sweepAngle);
    const innerEnd = polarToCartesian(innerR, startAngle);
    const largeArc = sweepAngle > 180 ? 1 : 0;
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Sebaran SBU Project</h2>
      <div className="bg-white border border-gray-100 rounded-2xl flex items-center justify-center w-full" style={{ height: "380px" }}>
        <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={arcPath(arc.startAngle, arc.sweepAngle, arc.outerR)}
                fill={arc.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </svg>
          {arcs.map((arc, i) => {
            const midAngle = arc.startAngle + arc.sweepAngle / 2;
            const pos = polarToCartesian(arc.outerR + 28, midAngle);
            return (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: "translate(-50%, -50%)" }}
              >
                <span className="text-[14px] font-bold text-[#1B1C1F]">{Math.round(arc.pct * 100)}%</span>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{arc.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

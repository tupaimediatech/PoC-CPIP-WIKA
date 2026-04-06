"use client";

import React from "react";
import { CurrencyDollar, CalendarBlank } from "@phosphor-icons/react";

type Props = {
  label: string;
  value: number;
  type?: "cost" | "schedule";
};

export default function GaugeChart({ label, value, type = "cost" }: Props) {
  const MAX = 1.2;
  const TARGET = 1.0;
  const clamped = Math.min(Math.max(value, 0), MAX);
  const fillPct = (clamped / MAX) * 100;
  const targetPct = (TARGET / MAX) * 100;

  const isGood = clamped >= TARGET;
  const statusColor = isGood ? "#16A34A" : "#DC2626";
  const statusText =
    type === "cost"
      ? isGood
        ? "Cost Efficient"
        : "Over Budget"
      : isGood
        ? "Ahead of Schedule"
        : "Behind Schedule";

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-xl px-8 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center shrink-0">
          {type === "cost" ? (
            <CurrencyDollar size={16} color="white" />
          ) : (
            <CalendarBlank size={16} color="white" />
          )}
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative h-5">
          <div
            className="absolute flex flex-col items-center"
            style={{ left: `${targetPct}%`, transform: "translateX(-50%)" }}
          >
            <span className="text-xs font-semibold text-gray-400 leading-none">
              Target
            </span>
          </div>
        </div>

        <div className="relative h-5 rounded-full bg-gray-100 overflow-visible">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${fillPct}%`,
              backgroundColor: "#1D4ED8",
            }}
          />

          <div
            className="absolute -top-1.5 -bottom-1.5 flex flex-col items-center"
            style={{ left: `${targetPct}%`, transform: "translateX(-50%)" }}
          >
            <div
              style={{
                width: "2px",
                height: "100%",
                backgroundImage:
                  "repeating-linear-gradient(to bottom, #9CA3AF 0px, #9CA3AF 4px, transparent 4px, transparent 8px)",
              }}
            />
          </div>
        </div>

        <div className="relative h-4">
          {ticks.map((tick) => {
            const pct = (tick / MAX) * 100;
            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center"
                style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              >
                <span className="text-[10px] text-gray-400 font-medium leading-none">
                  {tick.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 pt-1">
        <span
          style={{
            fontSize: "48px",
            fontWeight: 900,
            color: statusColor,
            lineHeight: 1,
          }}
        >
          {clamped.toFixed(2)}
        </span>
        <span className="text-sm font-bold text-gray-800">{statusText}</span>
      </div>
    </div>
  );
}

export function VisualIndicatorSection({
  cpi = 0.85,
  spi = 1.05,
}: {
  cpi?: number;
  spi?: number;
}) {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl px-8 py-6 flex flex-col gap-5">
      <h2 className="text-base font-bold text-gray-900 tracking-wide">
        Visual Indicator
      </h2>
      <div className="flex gap-4">
        <GaugeChart label="Cost Performance Index" value={cpi} type="cost" />
        <GaugeChart
          label="Schedule Performance Index"
          value={spi}
          type="schedule"
        />
      </div>
    </div>
  );
}

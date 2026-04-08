"use client";

import {
  Info,
  Calculator,
  CalendarBlank,
  CurrencyDollar,
  TrendUp,
  TrendDown,
} from "@phosphor-icons/react";
import type { Project } from "@/types/project";
import { formatKpi, formatCurrency } from "@/lib/utils";

type Props = {
  project: Project;
};

function MetricCard({
  label,
  value,
  sub,
  isUp,
  trendLabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  isUp: boolean;
  trendLabel: string;
  icon: any;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1D4ED8] rounded flex items-center justify-center shadow-sm shrink-0">
            <Icon size={16} className="text-white" />
          </div>
          <span className="text-[16px] font-bold text-[#535355] tracking-tight">
            {label}
          </span>
        </div>
        <Info
          size={15}
          className="text-[#1D4ED8] cursor-help opacity-70 hover:opacity-100 transition-opacity"
        />
      </div>

      <div className="mt-1">
        <h3 className="text-[32px] font-bold text-[#1B1C1F] leading-none tracking-tighter">
          {value}
        </h3>
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        <div
          className={`flex items-center gap-1 text-[11px] font-bold ${isUp ? "text-green-600" : "text-red-600"}`}
        >
          {isUp ? <TrendUp size={12} /> : <TrendDown size={12} />}
          <span>{trendLabel}</span>
          <span className="text-gray-400 font-medium ml-0.5">vs Last Year</span>
        </div>
        <p
          className="text-[10px] text-gray-400 font-medium leading-tight truncate"
          title={sub}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

export default function PerformanceHistory({ project }: Props) {
  const cpi = parseFloat(project.cpi ?? '0');
  const spi = parseFloat(project.spi ?? '0');
  const plannedCost = parseFloat(project.planned_cost);
  const actualCost = parseFloat(project.actual_cost);
  const scheduleDelay = project.actual_duration - project.planned_duration;
  const costVariance = plannedCost - actualCost;
  const cvPct =
    plannedCost > 0 ? Math.abs(costVariance / plannedCost) * 100 : 0;

  return (
    <div className="w-full h-57 bg-white flex flex-col overflow-hidden px-8 py-4 gap-4.5">
      <div className="flex justify-between items-center">
        <h1 className="text-[20px] font-bold text-[#1B1C1F] tracking-tight">
          {project.project_name}
        </h1>
        <div className="flex items-center gap-4 text-[12px] text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span>Division:</span>
            <span className="text-[#1B1C1F] font-bold">{project.division}</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span>Contract Value:</span>
            <span className="text-[#1B1C1F] font-bold">
              {formatCurrency(project.contract_value)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Year:</span>
            <span className="text-[#1B1C1F] font-bold ml-1">
              {project.project_year}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 grow">
        <MetricCard
          label="CPI"
          value={formatKpi(cpi)}
          sub={
            cpi >= 1
              ? "On / Under Budget"
              : `Overbudget ${((1 - cpi) * 100).toFixed(1)}%`
          }
          trendLabel="-0.05"
          isUp={false}
          icon={Calculator}
        />
        <MetricCard
          label="SPI"
          value={formatKpi(spi)}
          sub={
            spi >= 1
              ? "On / Ahead Schedule"
              : `Behind schedule ${((1 - spi) * 100).toFixed(1)}%`
          }
          trendLabel="-0.02"
          isUp={false}
          icon={CalendarBlank}
        />
        <MetricCard
          label="Cost Variance"
          value={
            costVariance >= 0
              ? `+${formatCurrency(costVariance)}`
              : `-${formatCurrency(Math.abs(costVariance))}`
          }
          sub={
            costVariance >= 0
              ? `Efisiensi ${cvPct.toFixed(1)}%`
              : `Overrun ${cvPct.toFixed(1)}%`
          }
          trendLabel="+3"
          isUp={true}
          icon={CurrencyDollar}
        />
        <MetricCard
          label="Schedule Delay"
          value={scheduleDelay <= 0 ? "0" : `${Math.abs(scheduleDelay)}`}
          sub={
            scheduleDelay === 0
              ? "Sesuai rencana"
              : scheduleDelay > 0
                ? `Late ${scheduleDelay} Mo`
                : `Faster ${Math.abs(scheduleDelay)} Mo`
          }
          trendLabel="4%"
          isUp={scheduleDelay <= 0}
          icon={CalendarBlank}
        />
      </div>
    </div>
  );
}

'use client';

import mockData from '@/data/mock-data.json';

const SEGMENTS = mockData.sebaranSBU;

const MAX_VALUE = Math.max(...SEGMENTS.map(s => s.value));
const TOTAL = SEGMENTS.reduce((acc, s) => acc + s.value, 0);

export default function SebaranSBUChart() {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxOuterR = 130;
  const innerR = 30;

  const sliceAngle = 360 / SEGMENTS.length;

  const arcs = SEGMENTS.map((seg, i) => {
    const startAngle = -90 + i * sliceAngle;
    const outerR = innerR + ((seg.value / MAX_VALUE) * (maxOuterR - innerR));
    const pct = seg.value / TOTAL;
    return { ...seg, startAngle, sweepAngle: sliceAngle, outerR, pct };
  });

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  }

  function arcPath(startAngle: number, sweepAngle: number, outerRadius: number, innerRadius: number) {
    const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle + sweepAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle + sweepAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);
    const largeArc = sweepAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ');
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">
        Sebaran SBU Project
      </h2>

      <div
        className="bg-white border border-gray-100 rounded-2xl flex items-center justify-center w-full"
        style={{ height: '380px' }}
      >
        <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={arcPath(arc.startAngle, arc.sweepAngle, arc.outerR, innerR)}
                fill={arc.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </svg>

          {arcs.map((arc, i) => {
            const midAngle = arc.startAngle + arc.sweepAngle / 2;
            const labelR = arc.outerR + 28;
            const pos = polarToCartesian(cx, cy, labelR, midAngle);
            const displayPct = Math.round(arc.pct * 100);

            return (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="text-[14px] font-bold text-[#1B1C1F]">{displayPct}%</span>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">{arc.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

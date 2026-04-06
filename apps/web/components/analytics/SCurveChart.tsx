'use client';

interface SCurveChartProps {
  months: string[];
  plan: number[];
  actual: number[];
}

const Y_TICKS = [0, 20, 40, 60, 80, 100];
const PADDING = { top: 10, right: 20, bottom: 0, left: 0 };

function buildSplinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
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
  return parts.join(' ');
}

export default function SCurveChart({ months, plan, actual }: SCurveChartProps) {
  const svgW = 700;
  const svgH = 300;
  const chartW = svgW - PADDING.left - PADDING.right;
  const chartH = svgH - PADDING.top - PADDING.bottom;

  function getX(idx: number) {
    return PADDING.left + (idx / (months.length - 1)) * chartW;
  }
  function getY(val: number) {
    return PADDING.top + chartH - (val / 100) * chartH;
  }

  const planPoints = plan.map((v, i) => ({ x: getX(i), y: getY(v) }));
  const actualPoints = actual.map((v, i) => ({ x: getX(i), y: getY(v) }));

  const planPath = buildSplinePath(planPoints);
  const actualPath = buildSplinePath(actualPoints);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl" style={{ padding: '24px 16px 30px 16px' }}>
      <div className="flex gap-2 h-full">
        <div className="relative shrink-0" style={{ width: '36px', height: `${svgH}px` }}>
          {Y_TICKS.map(tick => (
            <span
              key={tick}
              className="absolute text-[11px] text-gray-400 font-medium leading-none"
              style={{
                bottom: `${(tick / 100) * 100}%`,
                right: 0,
                transform: 'translateY(50%)',
              }}
            >
              {tick}%
            </span>
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="relative" style={{ height: `${svgH}px` }}>
            <div className="absolute inset-0 pointer-events-none">
              {Y_TICKS.map(tick => (
                <div
                  key={tick}
                  className="absolute w-full"
                  style={{
                    bottom: `${(tick / 100) * 100}%`,
                    borderTop: `1px solid ${tick === 0 ? '#D1D5DB' : '#F3F4F6'}`,
                  }}
                />
              ))}
            </div>

            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
            >
              {/* Plan line (gray) */}
              <path d={planPath} fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
              {/* Actual line (red) */}
              <path d={actualPath} fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />

              {/* Plan dots */}
              {planPoints.filter((_, i) => i === 5 || i === 10).map((p, i) => (
                <circle key={`plan-${i}`} cx={p.x} cy={p.y} r="5" fill="#1B1C1F" />
              ))}
              {/* Actual dots */}
              {actualPoints.filter((_, i) => i === 9).map((p, i) => (
                <circle key={`actual-${i}`} cx={p.x} cy={p.y} r="5" fill="#1B1C1F" />
              ))}
            </svg>
          </div>

          <div className="flex justify-between pt-3">
            {months.map(m => (
              <span key={m} className="text-[10px] font-medium text-gray-400">{m}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pl-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#1B1C1F]">Red Line</span>
              <span className="text-[11px] text-gray-500">Actual</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#9CA3AF]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#1B1C1F]">Grey Line</span>
              <span className="text-[11px] text-gray-500">Plan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

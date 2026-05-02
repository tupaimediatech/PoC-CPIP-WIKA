<?php

namespace App\Services;

use Illuminate\Support\Collection;

class KpiCalculatorService
{
    /**
     * Aggregate EV/PV/AC over leaf work items (bobot_pct > 0).
     * Returns null CPI/SPI when denominators are 0.
     *
     * EV = volume * harsat_internal * progress_actual_pct
     * PV = volume * harsat_internal * progress_plan_pct
     * AC = volume_actual * harsat_actual
     *
     * progress_*_pct values may be stored as fractions (0..1) or percentages (0..100);
     * normalize to fraction first.
     */
    public function summarizeFromWorkItems(Collection $items): array
    {
        $sumEv = 0.0;
        $sumPv = 0.0;
        $sumAc = 0.0;

        foreach ($items as $row) {
            $bobot = (float) ($row->bobot_pct ?? 0);
            if ($bobot <= 0) continue;

            $vol      = (float) ($row->volume ?? 0);
            $hs       = (float) ($row->harsat_internal ?? 0);
            $volAct   = (float) ($row->volume_actual ?? 0);
            $hsAct    = (float) ($row->harsat_actual ?? 0);
            $plan     = $this->normalizeFraction((float) ($row->progress_plan_pct ?? 0));
            $actual   = $this->normalizeFraction((float) ($row->progress_actual_pct ?? 0));

            $budget = $vol * $hs;
            $sumPv += $budget * $plan;
            $sumEv += $budget * $actual;
            $sumAc += $volAct * $hsAct;
        }

        $cpi = $sumAc > 0 ? round($sumEv / $sumAc, 4) : null;
        $spi = $sumPv > 0 ? round($sumEv / $sumPv, 4) : null;

        return [
            'pv'  => $sumPv,
            'ev'  => $sumEv,
            'ac'  => $sumAc,
            'cpi' => $cpi,
            'spi' => $spi,
        ];
    }

    private function normalizeFraction(float $v): float
    {
        // Treat values > 1.5 as percentages (e.g. 92 → 0.92)
        return $v > 1.5 ? $v / 100.0 : $v;
    }


    /**
     * Calculate CPI, SPI, and status for a project.
     *
     * Returns null for CPI/SPI when the required inputs are unavailable,
     * which is more honest than returning 0 for "no data".
     */
    public function calculate(
        ?float $plannedCost,
        ?float $actualCost,
        ?int   $plannedDuration,
        ?int   $actualDuration,
        ?float $progressPct = 100.0,
    ): array {
        $cpi = $this->calculateCpi($plannedCost, $actualCost, $progressPct);
        $spi = $this->calculateSpi($plannedDuration, $actualDuration);

        return [
            'cpi'    => $cpi,
            'spi'    => $spi,
            'status' => $this->determineStatus($cpi, $spi),
        ];
    }

    // KPI values outside this range indicate a data quality issue (e.g. mismatched
    // units between planned and actual fields). We store null rather than a
    // nonsensical number that would also overflow narrow decimal columns.
    private const MAX_REASONABLE_KPI = 1000.0;

    public function calculateCpi(?float $plannedCost, ?float $actualCost, ?float $progressPct): ?float
    {
        if ($plannedCost === null || $actualCost === null || $progressPct === null) {
            return null;
        }

        if ($actualCost == 0) {
            return null;
        }

        $earnedValue = ($progressPct / 100) * $plannedCost;
        $cpi = round($earnedValue / $actualCost, 4);

        return abs($cpi) <= self::MAX_REASONABLE_KPI ? $cpi : null;
    }

    public function calculateSpi(?int $plannedDuration, ?int $actualDuration): ?float
    {
        if ($plannedDuration === null || $actualDuration === null) {
            return null;
        }

        if ($actualDuration == 0) {
            return null;
        }

        $spi = round($plannedDuration / $actualDuration, 4);

        return abs($spi) <= self::MAX_REASONABLE_KPI ? $spi : null;
    }

    public function determineStatus(?float $cpi, ?float $spi): string
    {
        // Cannot determine status without KPI values
        if ($cpi === null || $spi === null) {
            return 'unknown';
        }

        if ($cpi < 0.9 || $spi < 0.9) {
            return 'critical';
        }

        if ($cpi >= 1.0 && $spi >= 1.0) {
            return 'good';
        }

        return 'warning';
    }
}

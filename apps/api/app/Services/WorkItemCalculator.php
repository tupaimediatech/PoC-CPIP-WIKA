<?php

namespace App\Services;

/**
 * Helper for deriving work item and vendor monetary values from raw inputs.
 *
 * Single source of truth for formulas documented in the Excel layout:
 *   Nilai Budget = Volume Budget × Harga Satuan
 *   Nilai Aktual = Volume Aktual × Harsat Aktual
 *   PV           = Volume Budget × Harga Satuan × Progress Plan
 *   EV           = Volume Budget × Harga Satuan × Actual Progress
 *   AC           = Nilai Aktual
 *   Variance     = Nilai Budget − Nilai Aktual
 *   Retensi 5%   = Nilai Kontrak Vendor × 0.05
 *   Sisa Hutang  = Nilai Kontrak Vendor × 0.95 − Termin Dibayar
 */
class WorkItemCalculator
{
    public const RETENSI_RATE = 0.05;

    public static function nilaiBudget(?float $volumeBudget, ?float $hargaSatuan): ?float
    {
        if ($volumeBudget === null || $hargaSatuan === null) return null;
        return $volumeBudget * $hargaSatuan;
    }

    public static function nilaiAktual(?float $volumeAktual, ?float $harsatAktual): ?float
    {
        if ($volumeAktual === null || $harsatAktual === null) return null;
        return $volumeAktual * $harsatAktual;
    }

    public static function plannedValue(?float $volumeBudget, ?float $hargaSatuan, ?float $progressPlan): ?float
    {
        $budget = self::nilaiBudget($volumeBudget, $hargaSatuan);
        if ($budget === null || $progressPlan === null) return null;
        return $budget * $progressPlan;
    }

    public static function earnedValue(?float $volumeBudget, ?float $hargaSatuan, ?float $actualProgress): ?float
    {
        $budget = self::nilaiBudget($volumeBudget, $hargaSatuan);
        if ($budget === null || $actualProgress === null) return null;
        return $budget * $actualProgress;
    }

    public static function actualCost(?float $volumeAktual, ?float $harsatAktual): ?float
    {
        return self::nilaiAktual($volumeAktual, $harsatAktual);
    }

    public static function variance(?float $nilaiBudget, ?float $nilaiAktual): ?float
    {
        if ($nilaiBudget === null || $nilaiAktual === null) return null;
        return $nilaiBudget - $nilaiAktual;
    }

    public static function variancePct(?float $nilaiBudget, ?float $nilaiAktual): ?float
    {
        if ($nilaiBudget === null || $nilaiAktual === null || $nilaiBudget == 0.0) return null;
        return (($nilaiBudget - $nilaiAktual) / $nilaiBudget) * 100.0;
    }

    public static function retensi5(?float $nilaiKontrak): ?float
    {
        if ($nilaiKontrak === null) return null;
        return $nilaiKontrak * self::RETENSI_RATE;
    }

    public static function sisaHutang(?float $nilaiKontrak, ?float $terminDibayar): ?float
    {
        if ($nilaiKontrak === null) return null;
        return $nilaiKontrak * (1 - self::RETENSI_RATE) - ($terminDibayar ?? 0.0);
    }
}

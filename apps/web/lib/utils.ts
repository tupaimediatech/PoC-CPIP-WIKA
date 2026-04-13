/**
 * Parse nilai dari Laravel yang bisa string atau number.
 * Laravel decimal field selalu return string, jadi helper ini
 * dipakai di banyak komponen sebelum kalkulasi.
 */
export function toNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  return typeof value === 'string' ? parseFloat(value) : value;
}

/**
 * Format angka (dalam Juta) jadi tampilan currency IDR penuh.
 *
 * Konversi: Juta × 1.000.000 → IDR, lalu format dengan titik ribuan.
 *   - 2.800 Juta  → "Rp2.800.000.000"
 *   - 87.263 Juta  → "Rp87.263.000.000"
 *   - 1.750 Juta  → "Rp1.750.000.000"
 */
export function formatCurrency(valueInJuta: string | number | null | undefined): string {
  const val = toNum(valueInJuta);
  if (Number.isNaN(val)) return '—';
  const idr = Math.round(val * 1_000_000);
  return `Rp${idr.toLocaleString('id-ID')}`;
}

/**
 * Format nilai KPI jadi 2 desimal.
 */
export function formatKpi(value: string | number | null | undefined): string {
  const numeric = toNum(value);
  return Number.isNaN(numeric) ? '—' : numeric.toFixed(2);
}

/**
 * Tailwind text color berdasarkan nilai KPI.
 * Hanya warna — bold/semibold diatur oleh komponen masing-masing.
 */
export function kpiColor(value: string | number | null | undefined): string {
  const val = toNum(value);
  if (Number.isNaN(val)) return 'text-gray-400';
  if (val >= 1)   return 'text-green-600';
  if (val >= 0.9) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Intent level berdasarkan nilai KPI.
 * Dipakai komponen yang butuh lebih dari sekadar warna (misal border, bg).
 */
export function kpiIntent(value: string | number | null | undefined): 'good' | 'warning' | 'critical' {
  const val = toNum(value);
  if (Number.isNaN(val)) return 'warning';
  if (val >= 1)   return 'good';
  if (val >= 0.9) return 'warning';
  return 'critical';
}

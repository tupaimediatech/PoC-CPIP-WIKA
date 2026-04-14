<?php

namespace App\Services;

use App\Enums\Division;
use App\Models\ColumnAlias;

class WorkbookFieldMapper
{
    public const CONTEXTS = [
        'project',
        'work_item',
        'material',
        'equipment',
        's_curve',
    ];

    private const IGNORED_HEADERS = [
        'no',
        'nomor',
        'urutan',
        'index',
    ];

    // Only these two are strictly required to identify a project.
    // Financial/operational fields are nullable — KPI will be null when unavailable.
    private const REQUIRED_PROJECT_FIELDS = [
        'project_code',
        'project_name',
    ];

    private const KNOWN_FIELDS = [
            'project' => [
            'project_code',
            'project_name',
            'project_year',
            'division',
            'sbu',
            'owner',
            'client_name',
            'project_manager',
            'contract_value',
            'addendum_value',
            'total_pagu',
            'planned_cost',
            'actual_cost',
            'planned_duration',
            'actual_duration',
            'progress_pct',
            'progress_prev_pct',
            'progress_this_pct',
            'progress_total_pct',
            'period',
        ],
        'work_item' => [
            'item_no',
            'item_name',
            'volume',
            'satuan',
            'harsat_internal',
            'volume_actual',
            'harsat_actual',
            'cost_category',
            'cost_subcategory',
            'budget_awal',
            'addendum',
            'total_budget',
            'realisasi',
            'deviasi',
            'deviasi_pct',
            'bobot_pct',
            'progress_plan_pct',
            'progress_actual_pct',
            'planned_value',
            'earned_value',
            'actual_cost_item',
            'vendor_name',
            'po_number',
            'vendor_contract_value',
            'termin_paid',
            'retention',
            'outstanding_debt',
            'data_source',
            'notes',
            'cpi',
            'spi',
            'sbu',
        ],
        'material' => [
            'supplier_name',
            'material_type',
            'qty',
            'satuan',
            'harga_satuan',
            'total_tagihan',
            'is_discount',
        ],
        'equipment' => [
            'vendor_name',
            'equipment_name',
            'jam_kerja',
            'rate_per_jam',
            'total_biaya',
            'payment_status',
        ],
        's_curve' => [
            'week_number',
            'rencana_pct',
            'realisasi_pct',
            'deviasi_pct',
            'keterangan',
        ],
    ];

    private const BUILTIN_ALIASES = [
        'project' => [
            'project_kode' => 'project_code',
            'kode_project' => 'project_code',
            'kode_proyek' => 'project_code',
            'kode' => 'project_code',
            'code' => 'project_code',
            'id_proyek' => 'project_code',
            'no_registrasi' => 'project_code',
            'kode_unit' => 'project_code',
            'seri_proyek' => 'project_code',
            'nama_project' => 'project_name',
            'nama_proyek' => 'project_name',
            'proyek' => 'project_name',
            'nama' => 'project_name',
            'project' => 'project_name',
            'judul_proyek' => 'project_name',
            'nama_gedung' => 'project_name',
            'nama_pekerjaan' => 'project_name',
            'deskripsi_proyek' => 'project_name',
            'nama_kontrak' => 'project_code',
            'kode_kontrak' => 'project_code',
            'nomor_kontrak' => 'project_code',
            'no_kontrak' => 'project_code',
            'year' => 'project_year',
            'tahun' => 'project_year',
            'tahun_anggaran' => 'project_year',
            'tahun_pelaksanaan' => 'project_year',
            'tahun_proyek' => 'project_year',
            'divisi' => 'division',
            'div' => 'division',
            'departemen' => 'division',
            'kategori_proyek' => 'division',
            'sektor' => 'division',
            'bidang' => 'division',
            'contract_value_m' => 'contract_value',
            'nilai_kontrak' => 'contract_value',
            'nilai_kontrak_m' => 'contract_value',
            'total_kontrak' => 'contract_value',
            'total_kontrak_m' => 'contract_value',
            'valuasi_kontrak' => 'contract_value',
            'valuasi_kontrak_m' => 'contract_value',
            'harga_kontrak' => 'contract_value',
            'harga_kontrak_m' => 'contract_value',
            'nilai_investasi' => 'contract_value',
            'nilai_investasi_m' => 'contract_value',
            'contract' => 'contract_value',
            'kontrak' => 'contract_value',
            'nilai' => 'contract_value',
            'total_pagu' => 'total_pagu',
            'planned_cost_m' => 'planned_cost',
            'rencana_biaya' => 'planned_cost',
            'rencana_biaya_m' => 'planned_cost',
            'anggaran_terencana' => 'planned_cost',
            'anggaran_terencana_m' => 'planned_cost',
            'budget_rencana' => 'planned_cost',
            'budget_rencana_m' => 'planned_cost',
            'rencana_pengeluaran' => 'planned_cost',
            'rencana_pengeluaran_m' => 'planned_cost',
            'plafon_biaya' => 'planned_cost',
            'plafon_biaya_m' => 'planned_cost',
            'biaya_rencana' => 'planned_cost',
            'planned' => 'planned_cost',
            'actual_cost_m' => 'actual_cost',
            'biaya_aktual' => 'actual_cost',
            'biaya_aktual_m' => 'actual_cost',
            'pengeluaran_riil' => 'actual_cost',
            'pengeluaran_riil_m' => 'actual_cost',
            'total_biaya_akhir' => 'actual_cost',
            'total_biaya_akhir_m' => 'actual_cost',
            'realisasi_biaya' => 'actual_cost',
            'realisasi_biaya_m' => 'actual_cost',
            'serapan_biaya' => 'actual_cost',
            'serapan_biaya_m' => 'actual_cost',
            'aktual_biaya' => 'actual_cost',
            'biaya_aktual_biaya' => 'actual_cost',
            'actual' => 'actual_cost',
            'planned_duration_month' => 'planned_duration',
            'planned_duration_bulan' => 'planned_duration',
            'rencana_durasi' => 'planned_duration',
            'rencana_durasi_bulan' => 'planned_duration',
            'target_waktu' => 'planned_duration',
            'target_waktu_bulan' => 'planned_duration',
            'estimasi_durasi' => 'planned_duration',
            'estimasi_durasi_bulan' => 'planned_duration',
            'jadwal_kerja' => 'planned_duration',
            'jadwal_kerja_bulan' => 'planned_duration',
            'durasi_pengerjaan' => 'planned_duration',
            'durasi_pengerjaan_bulan' => 'planned_duration',
            'durasi_rencana' => 'planned_duration',
            'planned_dur' => 'planned_duration',
            'durasi_aktual' => 'actual_duration',
            'durasi_aktual_bulan' => 'actual_duration',
            'waktu_realisasi' => 'actual_duration',
            'durasi_final' => 'actual_duration',
            'masa_pelaksanaan' => 'actual_duration',
            'durasi_terpakai' => 'actual_duration',
            'aktual_durasi' => 'actual_duration',
            'actual_dur' => 'actual_duration',
            'realisasi_durasi' => 'actual_duration',
            'pemilik' => 'owner',
            'instansi' => 'owner',
            'klien' => 'owner',
            'penyelenggara' => 'owner',
            'client' => 'client_name',
            'client_name' => 'client_name',
            'nama_client' => 'client_name',
            'nama_klien' => 'client_name',
            'project_manager' => 'project_manager',
            'manager' => 'project_manager',
            'manajer' => 'project_manager',
            'pm' => 'project_manager',
            'manager_proyek' => 'project_manager',
            'nama_pm' => 'project_manager',
            'pic_project' => 'project_manager',
            'progress_' => 'progress_pct',
            'progress' => 'progress_pct',
            'progres' => 'progress_pct',
            'progress_persen' => 'progress_pct',
            'progress_total' => 'progress_total_pct',
            'progress_total_pct' => 'progress_total_pct',
            'progress_sampai_bulan_lalu' => 'progress_prev_pct',
            'progress_bulan_ini' => 'progress_this_pct',
            'addendum' => 'addendum_value',
            'addendum_value' => 'addendum_value',
            'nilai_addendum' => 'addendum_value',
            'addendum_kontrak' => 'addendum_value',
            'periode_laporan' => 'period',
            'bulan' => 'period',
            'periode' => 'period',
            'pemberi_tugas' => 'client_name',
            'sbu_utama' => 'sbu',
            'sbu' => 'sbu',
            'durasi' => 'planned_duration',
        ],
        'work_item' => [
            'nomor' => 'item_no',
            'no' => 'item_no',
            'a_no' => 'item_no',
            'wbs' => 'item_no',
            'nama_item' => 'item_name',
            'uraian' => 'item_name',
            'uraian_pekerjaan' => 'item_name',
            'kategori' => 'cost_category',
            'kateogri' => 'cost_category',
            'item_pekerjaan' => 'item_name',
            'b_item_pekerjaan' => 'item_name',
            // Volume, unit, unit price
            'volume_budget' => 'volume',
            'vol_budget' => 'volume',
            'volume_aktual' => 'volume_actual',
            'vol_aktual' => 'volume_actual',
            'harga_satuan' => 'harsat_internal',
            'harsat' => 'harsat_internal',
            'harsat_aktual' => 'harsat_actual',
            'harsat_budget' => 'harsat_internal',
            'satuan' => 'satuan',
            'unit' => 'satuan',
            // Budget fields
            'budget_awal' => 'budget_awal',
            'anggaran_awal' => 'budget_awal',
            'plan_hpp' => 'total_budget',
            'c_plan_hpp' => 'total_budget',
            'addendum' => 'addendum',
            'total_budget' => 'total_budget',
            'nilai_budget' => 'total_budget',
            'nilai_aktual' => 'realisasi',
            'realisasi' => 'realisasi',
            'realisasi_itd' => 'realisasi',
            'actual_itd' => 'realisasi',
            'd_actual_itd' => 'realisasi',
            'deviasi' => 'deviasi',
            'selisih' => 'deviasi',
            'e_deviasi' => 'deviasi',
            'deviasi_pct' => 'deviasi_pct',
            // Cost categorization
            'kategori_biaya' => 'cost_category',
            'sub_kategori' => 'cost_subcategory',
            // Progress & EVM
            'bobot_pekerjaan' => 'bobot_pct',
            'bobot' => 'bobot_pct',
            'progress_plan' => 'progress_plan_pct',
            'rencana_progress' => 'progress_plan_pct',
            'actual_progress' => 'progress_actual_pct',
            'progress_aktual' => 'progress_actual_pct',
            'planned_value_pv' => 'planned_value',
            'planned_value' => 'planned_value',
            'pv' => 'planned_value',
            'earned_value_ev' => 'earned_value',
            'earned_value' => 'earned_value',
            'ev' => 'earned_value',
            'actual_cost_ac' => 'actual_cost_item',
            'actual_cost' => 'actual_cost_item',
            'ac' => 'actual_cost_item',
            // EVM with slash notation
            'pv_bcws' => 'planned_value',
            'ev_bcwp' => 'earned_value',
            'ac_acwp' => 'actual_cost_item',
            'cpi' => 'cpi',
            'spi' => 'spi',
            // Embedded vendor
            'vendor' => 'vendor_name',
            'nama_vendor' => 'vendor_name',
            'vendor_subkon' => 'vendor_name',
            'vendor_subkontraktor' => 'vendor_name',
            'nomor_po' => 'po_number',
            'no_po' => 'po_number',
            'nilai_kontrak_vendor' => 'vendor_contract_value',
            'kontrak_vendor' => 'vendor_contract_value',
            'termin_dibayar' => 'termin_paid',
            'termin' => 'termin_paid',
            'retensi_5' => 'retention',
            'retensi' => 'retention',
            'sisa_hutang' => 'outstanding_debt',
            'sisa_kewajiban' => 'outstanding_debt',
            // SBU
            'sbu' => 'sbu',
            'sbu_utama' => 'sbu',
            // Audit
            'sumber_data' => 'data_source',
            'sumber_dokumen' => 'data_source',
            'source' => 'data_source',
            'notes' => 'notes',
            'catatan' => 'notes',
            'keterangan' => 'notes',
        ],
        'material' => [
            'supplier' => 'supplier_name',
            'vendor' => 'supplier_name',
            'nama_supplier' => 'supplier_name',
            'deskripsi_vendor' => 'supplier_name',
            'vendor_subkontraktor' => 'supplier_name',
            'vendor_subkon' => 'supplier_name',
            'material' => 'material_type',
            'jenis_material' => 'material_type',
            'nama_material' => 'material_type',
            'lingkup_pekerjaan' => 'material_type',
            'lingkup' => 'material_type',
            'qty' => 'qty',
            'jumlah' => 'qty',
            'satuan' => 'satuan',
            'unit' => 'satuan',
            'nilai_kontrak' => 'total_tagihan',
            'harga_satuan' => 'harga_satuan',
            'harga' => 'harga_satuan',
            'total_tagihan' => 'total_tagihan',
            'total' => 'total_tagihan',
        ],
        'equipment' => [
            'vendor' => 'vendor_name',
            'nama_vendor' => 'vendor_name',
            'supplier' => 'vendor_name',
            'alat' => 'equipment_name',
            'alat_berat' => 'equipment_name',
            'equipment' => 'equipment_name',
            'nama_alat' => 'equipment_name',
            'jam' => 'jam_kerja',
            'jam_kerja' => 'jam_kerja',
            'hour_meter' => 'jam_kerja',
            'rate' => 'rate_per_jam',
            'rate_per_jam' => 'rate_per_jam',
            'rate_jam' => 'rate_per_jam',
            'tarif' => 'rate_per_jam',
            'total_biaya' => 'total_biaya',
            'biaya_total' => 'total_biaya',
            'payment_status' => 'payment_status',
            'status_pembayaran' => 'payment_status',
            'status' => 'payment_status',
        ],
        's_curve' => [
            'minggu_ke' => 'week_number',
            'minggu' => 'week_number',
            'week' => 'week_number',
            'rencana' => 'rencana_pct',
            'rencana_pct' => 'rencana_pct',
            'realisasi' => 'realisasi_pct',
            'realisasi_pct' => 'realisasi_pct',
            'deviasi' => 'deviasi_pct',
            'deviasi_pct' => 'deviasi_pct',
            'keterangan' => 'keterangan',
        ],
    ];

    private array $aliasCache = [];

    public static function builtinAliases(): array
    {
        return self::BUILTIN_ALIASES;
    }

    public static function builtinAliasesForSeeding(): array
    {
        $rows = [];

        foreach (self::BUILTIN_ALIASES as $context => $aliases) {
            foreach ($aliases as $alias => $targetField) {
                $rows[] = [
                    'alias' => $alias,
                    'target_field' => $targetField,
                    'context' => $context,
                ];
            }
        }

        return $rows;
    }

    public function requiredProjectFields(): array
    {
        return self::REQUIRED_PROJECT_FIELDS;
    }

    public function knownFields(string $context): array
    {
        return self::KNOWN_FIELDS[$context] ?? [];
    }

    public function normalizeHeader(string $value): string
    {
        $value = strtolower(trim($value));
        // Strip common unit suffixes like (Juta Rp), (%), (m), (bulan), etc.
        $value = preg_replace('/\s*\([^)]*(?:rp|idr|juta|ribu|persen|%|m|bulan|hari|unit|meter)[^)]*\)\s*/i', '', $value);
        $value = preg_replace('/[\s\n\r\t\-\(\)\.\/:]+/', '_', $value);
        $value = preg_replace('/[^\w]/', '', $value);

        return rtrim((string) $value, '_');
    }

    public function resolveAlias(string $value, string $context): ?string
    {
        $normalized = $this->normalizeHeader($value);

        if ($normalized === '') {
            return null;
        }

        $aliases = $this->aliasesForContext($context);

        foreach ($this->headerCandidates($normalized) as $candidate) {
            if (isset($aliases[$candidate])) {
                return $aliases[$candidate];
            }
        }

        return null;
    }

    public function resolveHeaders(array $rawHeaders, string $context): array
    {
        return array_map(function ($header) use ($context) {
            $normalized = $this->normalizeHeader((string) $header);

            return $this->resolveAlias($normalized, $context) ?? $normalized;
        }, $rawHeaders);
    }

    public function findUnrecognized(array $rawHeaders, array $resolvedHeaders, string $context): array
    {
        $known = $this->knownFields($context);
        $unrecognized = [];

        foreach ($rawHeaders as $index => $raw) {
            $normalized = $this->normalizeHeader((string) $raw);
            $resolved = $resolvedHeaders[$index] ?? $normalized;

            if (
                $normalized !== ''
                && !in_array($normalized, self::IGNORED_HEADERS, true)
                && !in_array($resolved, $known, true)
            ) {
                $unrecognized[] = $normalized;
            }
        }

        return array_values(array_unique($unrecognized));
    }

    public function parseFieldValue(string $field, mixed $value): mixed
    {
        return match ($field) {
            'contract_value',
            'addendum_value',
            'total_pagu',
            'planned_cost',
            'actual_cost',
            'budget_awal',
            'addendum',
            'total_budget',
            'realisasi',
            'deviasi',
            'volume',
            'harsat_internal',
            'volume_actual',
            'harsat_actual',
            'planned_value',
            'earned_value',
            'actual_cost_item',
            'vendor_contract_value',
            'termin_paid',
            'retention',
            'outstanding_debt',
            'qty',
            'harga_satuan',
            'total_tagihan',
            'jam_kerja',
            'rate_per_jam',
            'total_biaya' => $this->parseNumeric($value),
            'progress_pct',
            'progress_prev_pct',
            'progress_this_pct',
            'progress_total_pct',
            'deviasi_pct',
            'bobot_pct',
            'progress_plan_pct',
            'progress_actual_pct',
            'rencana_pct',
            'realisasi_pct' => $this->parsePercentage($value),
            'planned_duration',
            'actual_duration',
            'week_number',
            'project_year' => $this->parseInteger($value),
            'period' => is_string($value) ? $this->parsePeriod($value) : null,
            'division' => $this->normalizeDivision($value),
            default => is_string($value) ? trim($value) : $value,
        };
    }

    public function confidenceAdjustment(string $field, mixed $normalizedValue): int
    {
        if ($normalizedValue === null || $normalizedValue === '') {
            return -100;
        }

        return match ($field) {
            'project_code' => $this->projectCodeConfidence((string) $normalizedValue),
            'division' => $this->divisionConfidence((string) $normalizedValue),
            'period' => $this->periodConfidence((string) $normalizedValue),
            'project_year' => $this->yearConfidence($normalizedValue),
            'planned_duration', 'actual_duration', 'week_number' => $this->positiveIntegerConfidence($normalizedValue),
            'contract_value', 'addendum_value', 'total_pagu', 'planned_cost', 'actual_cost',
            'budget_awal', 'addendum', 'total_budget', 'realisasi', 'deviasi',
            'qty', 'harga_satuan', 'total_tagihan', 'jam_kerja', 'rate_per_jam', 'total_biaya'
                => $this->numericConfidence($normalizedValue),
            'progress_pct', 'progress_prev_pct', 'progress_this_pct', 'progress_total_pct',
            'deviasi_pct', 'rencana_pct', 'realisasi_pct'
                => $this->percentageConfidence($normalizedValue),
            'project_name', 'owner', 'client_name', 'project_manager',
            'item_name', 'material_type', 'equipment_name', 'supplier_name', 'vendor_name'
                => $this->textConfidence((string) $normalizedValue),
            default => 0,
        };
    }

    public function normalizeProjectData(array $data): array
    {
        $normalized = [];

        foreach ($data as $field => $value) {
            if (!in_array($field, $this->knownFields('project'), true)) {
                continue;
            }

            $normalized[$field] = $this->parseFieldValue($field, $value);
        }

        return $normalized;
    }

    public function parseNumeric(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        // If already a number, return directly
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $raw = trim((string) $value);
        $isNegative = str_starts_with($raw, '(') && str_ends_with($raw, ')');
        $normalized = str_replace(['(', ')'], '', $raw);

        // Detect number format:
        // International: 2,800.50 (comma = thousands, dot = decimal)
        // Indonesian:    2.800,50 (dot = thousands, comma = decimal)
        $lastDot = strrpos($normalized, '.');
        $lastComma = strrpos($normalized, ',');

        if ($lastDot !== false && $lastComma !== false) {
            if ($lastDot > $lastComma) {
                // International: 2,800.50 — dot is decimal
                $normalized = str_replace(',', '', $normalized);
            } else {
                // Indonesian: 2.800,50 — comma is decimal
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            }
        } elseif ($lastComma !== false && substr_count($normalized, ',') === 1) {
            // Could be "2,5" (decimal) or "2,800" (thousands)
            $afterComma = substr($normalized, $lastComma + 1);
            if (strlen($afterComma) === 3 && ctype_digit($afterComma)) {
                // "2,800" — likely thousands separator
                $normalized = str_replace(',', '', $normalized);
            } else {
                // "2,5" or "2,50" — likely decimal
                $normalized = str_replace(',', '.', $normalized);
            }
        } elseif ($lastComma !== false) {
            // Multiple commas: "1,000,000" — thousands separator
            $normalized = str_replace(',', '', $normalized);
        }
        // Single dot with no comma: already fine as-is

        $normalized = preg_replace('/[^\d.\-]/', '', $normalized);
        $normalized = preg_replace('/\.-$/', '', $normalized);
        $normalized = preg_replace('/\.$/', '', $normalized);

        if (!is_numeric($normalized)) {
            return null;
        }

        $number = (float) $normalized;

        return $isNegative ? $number * -1 : $number;
    }

    public function parsePercentage(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $raw = trim((string) $value);
        $isNegative = str_starts_with($raw, '(') && str_ends_with($raw, ')');
        $normalized = str_replace(['(', ')'], '', $raw);
        $normalized = str_replace('%', '', $normalized);
        $normalized = str_replace(',', '.', $normalized);
        $normalized = preg_replace('/[^\d.\-]/', '', $normalized);

        if (!is_numeric($normalized)) {
            return null;
        }

        $number = (float) $normalized;

        return $isNegative ? $number * -1 : $number;
    }

    public function parsePeriod(string $value): ?string
    {
        $months = [
            'januari' => '01',
            'februari' => '02',
            'maret' => '03',
            'april' => '04',
            'mei' => '05',
            'juni' => '06',
            'juli' => '07',
            'agustus' => '08',
            'september' => '09',
            'oktober' => '10',
            'november' => '11',
            'desember' => '12',
            'january' => '01',
            'february' => '02',
            'march' => '03',
            'april' => '04',
            'may' => '05',
            'june' => '06',
            'july' => '07',
            'august' => '08',
            'september' => '09',
            'october' => '10',
            'november' => '11',
            'december' => '12',
        ];

        $normalized = strtolower(trim($value));

        if (preg_match('/^(\d{4})-(\d{2})$/', $normalized)) {
            return $normalized;
        }

        foreach ($months as $month => $number) {
            if (str_contains($normalized, $month) && preg_match('/(\d{4})/', $value, $matches)) {
                return $matches[1] . '-' . $number;
            }
        }

        return null;
    }

    private function parseInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        $normalized = preg_replace('/[^\d\-]/', '', (string) $value);

        return is_numeric($normalized) ? (int) $normalized : null;
    }

    private function normalizeDivision(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $normalized = ucwords(strtolower(trim((string) $value)));

        // Only return if it matches a valid Division enum value.
        // An unrecognized string is treated as null so inferDivision() can take over.
        return in_array($normalized, Division::values(), true) ? $normalized : null;
    }

    private function projectCodeConfidence(string $value): int
    {
        $trimmed = trim($value);

        if (preg_match('/^[A-Z]{2,6}[-_\/]?\d{1,4}[A-Z0-9\-_\/]*$/', $trimmed)) {
            return 20;
        }

        if (preg_match('/^[A-Z0-9\-_\/]{4,20}$/', $trimmed)) {
            return 12;
        }

        if (str_contains($trimmed, ' ')) {
            return -12;
        }

        return 0;
    }

    private function divisionConfidence(string $value): int
    {
        return in_array($value, Division::values(), true) ? 18 : -18;
    }

    private function periodConfidence(string $value): int
    {
        return preg_match('/^\d{4}-\d{2}$/', $value) === 1 ? 16 : -10;
    }

    private function yearConfidence(mixed $value): int
    {
        $year = is_numeric($value) ? (int) $value : null;

        if ($year === null) {
            return -10;
        }

        return $year >= 2000 && $year <= 2099 ? 10 : -10;
    }

    private function positiveIntegerConfidence(mixed $value): int
    {
        if (!is_numeric($value)) {
            return -10;
        }

        return (int) $value > 0 ? 8 : -10;
    }

    private function numericConfidence(mixed $value): int
    {
        if (!is_numeric($value)) {
            return -10;
        }

        return (float) $value >= 0 ? 6 : 1;
    }

    private function percentageConfidence(mixed $value): int
    {
        if (!is_numeric($value)) {
            return -10;
        }

        $number = (float) $value;

        return $number >= -100 && $number <= 100 ? 8 : -8;
    }

    private function textConfidence(string $value): int
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return -10;
        }

        if (mb_strlen($trimmed) >= 5) {
            return 4;
        }

        return 1;
    }

    // ── Shared utilities for all importers ───────────────────────────────────

    public function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn($c) => $c !== null && $c !== ''));
    }

    public function detectLevel(string $itemNo, string $itemName): int
    {
        if (empty($itemNo)) {
            return $itemName === strtoupper($itemName) ? 0 : 1;
        }

        if (preg_match('/^[IVX]+\.?$/', $itemNo)) return 0;
        if (preg_match('/^\d+\.\d+\.\d+/', $itemNo)) return 2;
        if (preg_match('/^\d+\.\d+/', $itemNo)) return 1;
        if (preg_match('/^\d+\.?$/', $itemNo)) return 0;

        return 1;
    }

    /**
     * Find the first row index where all given keywords appear (as substrings) in the row cells.
     */
    public function findHeaderRowByKeywords(array $raw, array $keywords): ?int
    {
        foreach ($raw as $i => $row) {
            $cells   = array_map(fn($c) => strtolower(trim((string) $c)), $row);
            $matches = 0;
            foreach ($keywords as $kw) {
                foreach ($cells as $cell) {
                    if (str_contains($cell, $kw)) {
                        $matches++;
                        break;
                    }
                }
            }
            if ($matches >= count($keywords)) {
                return $i;
            }
        }

        return null;
    }

    private function aliasesForContext(string $context): array
    {
        if (!isset($this->aliasCache[$context])) {
            $aliases = self::BUILTIN_ALIASES[$context] ?? [];

            foreach (ColumnAlias::allForContext($context) as $alias => $target) {
                $aliases[$alias] = $target;
            }

            $this->aliasCache[$context] = $aliases;
        }

        return $this->aliasCache[$context];
    }

    private function headerCandidates(string $normalized): array
    {
        $candidates = [$normalized];
        $parts = array_values(array_filter(explode('_', $normalized)));

        if (count($parts) >= 2 && preg_match('/^[a-z]{1,2}$/', $parts[0]) === 1) {
            $candidates[] = implode('_', array_slice($parts, 1));
        }

        if (count($parts) >= 2 && preg_match('/^[a-z]{1,2}$/', $parts[0]) === 1 && preg_match('/^(no|nomor|col|kolom)$/', $parts[1]) === 1) {
            $candidates[] = implode('_', array_slice($parts, 2));
        }

        if (count($parts) >= 3) {
            $candidates[] = implode('_', array_slice($parts, 1));
            $candidates[] = implode('_', array_slice($parts, 2));
        }

        return array_values(array_unique(array_filter($candidates)));
    }
}

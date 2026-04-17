# CPIP — Cost Past Information Performance
## Project Context — Backend API Reference

> **Last updated:** 6 Apr 2026
> **Status:** PoC / Prototype aktif — semua pola ingestion sudah diimplementasi

---

## 1. Overview

**Client:** PT Wijaya Karya (WIKA) — Divisi 2: Building & Infrastructure
**Owner:** Trisya Media Teknologi (TMT)

Sistem analitik historis proyek konstruksi. Tujuan utama: bantu management WIKA memonitor CPI/SPI antar divisi, investigasi cost overrun via drill-down hierarkis, dan benchmark antar proyek.

**Tech Stack:**

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Laravel 11 (PHP)                  |
| Database  | PostgreSQL                        |
| Frontend  | Next.js + Recharts / Chart.js     |
| Auth      | Laravel Sanctum                   |
| Excel     | PhpSpreadsheet                    |

---

## 2. Struktur Database

### Relasi antar tabel

```
ingestion_files (1) ──── (many) projects
                                   │
                projects (1) ─────────────────────── (many) project_periods
                             │                                     │
                             │                     ┌──────────────┤
                             │                     │              │
                    progress_curves (per minggu)   │     (many) project_work_items  ← self-ref parent_id
                             │                     │
                          risks (manual)   ┌───────┴──────────────┐
                                           │                      │
                               project_material_logs   project_equipment_logs
```

### `projects` — Data utama proyek

| Kolom              | Tipe                  | Keterangan                                          |
|--------------------|-----------------------|-----------------------------------------------------|
| `project_code`     | string(20) UNIQUE     | Kode unik proyek, digunakan sebagai upsert key      |
| `project_name`     | string                | Nama proyek                                         |
| `division`         | string(100) nullable  | `Infrastructure` atau `Building`                    |
| `owner`            | string nullable       | Nama pemilik/klien proyek                           |
| `contract_value`   | decimal(15,2) nullable| Nilai kontrak (IDR)                                 |
| `planned_cost`     | decimal(15,2) nullable| Rencana biaya total                                 |
| `actual_cost`      | decimal(15,2) nullable| Biaya aktual saat ini                               |
| `planned_duration` | integer nullable      | Durasi rencana (bulan)                              |
| `actual_duration`  | integer nullable      | Durasi aktual (bulan)                               |
| `progress_pct`     | decimal(5,2)          | Persentase progress (0–100), default 100            |
| `project_year`     | integer               | Tahun proyek, default tahun saat insert             |
| `cpi`              | decimal(20,4) nullable| **Auto-computed** via `Model::saving()`             |
| `spi`              | decimal(20,4) nullable| **Auto-computed** via `Model::saving()`             |
| `status`           | string(20) nullable   | `good` / `warning` / `critical` / `unknown` — auto |
| `ingestion_file_id`| FK nullable           | Sumber file Excel                                   |

> Field financial dan durasi bersifat **nullable**. KPI akan `null` dan status `unknown`
> jika data belum tersedia — lebih jujur daripada default `0`.

### `project_periods` — Laporan bulanan per proyek

Satu proyek bisa punya banyak period (time-series). **Unique:** `project_id + period`.

| Kolom                | Tipe                  | Keterangan                                     |
|----------------------|-----------------------|------------------------------------------------|
| `project_id`         | FK                    | → projects                                     |
| `ingestion_file_id`  | FK nullable           | → ingestion_files                              |
| `period`             | string(7)             | Format `YYYY-MM`, contoh `2026-03`             |
| `client_name`        | string nullable       | Nama klien dari header laporan                 |
| `project_manager`    | string nullable       | Nama PM dari header laporan                    |
| `report_source`      | string nullable       | `file_import` / `adaptive_scan` / `manual`     |
| `progress_prev_pct`  | decimal(6,2)          | Progress s/d bulan lalu (%)                    |
| `progress_this_pct`  | decimal(6,2)          | Progress bulan ini (%)                         |
| `progress_total_pct` | decimal(6,2)          | Total progress kumulatif (%)                   |
| `contract_value`     | decimal(20,2)         | Snapshot nilai kontrak periode ini             |
| `addendum_value`     | decimal(20,2)         | Nilai addendum                                 |
| `bq_external`        | decimal(20,2)         | contract_value + addendum_value                |
| `actual_costs`       | decimal(20,2)         | Aggregate dari work_items.total_budget (level 0)|
| `realized_costs`     | decimal(20,2)         | Aggregate dari work_items.realisasi (level 0)  |
| `hpp_deviation`      | decimal(20,2)         | actual_costs - realized_costs                  |

### `project_work_items` — HPP hierarkis per periode

Self-referencing tree. Terikat ke `period_id` (bukan `project_id`) karena realisasi berubah tiap bulan.

| Kolom         | Tipe              | Keterangan                                              |
|---------------|-------------------|---------------------------------------------------------|
| `period_id`   | FK                | → project_periods                                       |
| `parent_id`   | FK nullable       | Self-ref. NULL = item level teratas (kategori)          |
| `level`       | tinyInteger       | 0 = kategori, 1 = sub-item, 2 = detail                  |
| `item_no`     | string(20) null   | `I.`, `1.1`, `2.2.1`, dsb.                             |
| `item_name`   | string(255)       | Nama item pekerjaan                                     |
| `sort_order`  | smallInteger      | Urutan tampil dalam satu parent                         |
| `budget_awal` | decimal(20,2)     | Budget sebelum addendum                                 |
| `addendum`    | decimal(20,2)     | Nilai addendum (bisa negatif)                           |
| `total_budget`| decimal(20,2)     | budget_awal + addendum                                  |
| `realisasi`   | decimal(20,2)     | Realisasi biaya ITD (Inception to Date)                 |
| `deviasi`     | decimal(20,2)     | total_budget − realisasi                                |
| `deviasi_pct` | decimal(8,4)      | deviasi / total_budget × 100                            |
| `is_total_row`| boolean           | True = baris total/subtotal, dikecualikan dari aggregate|

**Level detection logic** (di `WorkbookFieldMapper::detectLevel()`):
- `item_no` kosong + nama ALL CAPS → level 0
- `item_no` romawi (`I`, `II`, `III`) → level 0
- `item_no` pola `1.1.1` → level 2
- `item_no` pola `1.1` → level 1
- `item_no` pola `1` → level 0

### `project_material_logs` — Log material strategis

| Kolom           | Tipe              | Keterangan                                       |
|-----------------|-------------------|--------------------------------------------------|
| `period_id`     | FK                | → project_periods                                |
| `work_item_id`  | FK nullable       | → project_work_items (tidak selalu tersedia)     |
| `supplier_name` | string(200)       | Nama supplier/vendor                             |
| `material_type` | string(200)       | Jenis material                                   |
| `qty`           | decimal(15,4)     | Kuantitas                                        |
| `satuan`        | string(30)        | Satuan: m3, kg, ton, unit, dll                   |
| `harga_satuan`  | decimal(20,2)     | Harga per satuan (IDR)                           |
| `total_tagihan` | decimal(20,2)     | Total tagihan (bisa negatif = diskon)            |
| `is_discount`   | boolean           | True jika nama material mengandung "discount/potongan" |
| `source_row`    | smallInteger null | Nomor baris asli di Excel (untuk debugging)      |

### `project_equipment_logs` — Log alat berat

| Kolom            | Tipe              | Keterangan                                      |
|------------------|-------------------|-------------------------------------------------|
| `period_id`      | FK                | → project_periods                               |
| `work_item_id`   | FK nullable       | → project_work_items                            |
| `vendor_name`    | string(200)       | Nama vendor (**forward-filled** jika baris kosong)|
| `equipment_name` | string(200)       | Nama alat, contoh "Excavator PC200"             |
| `jam_kerja`      | decimal(10,2)     | Total jam pemakaian                             |
| `rate_per_jam`   | decimal(20,2)     | Harga sewa per jam (IDR)                        |
| `total_biaya`    | decimal(20,2)     | Biaya total penggunaan alat                     |
| `payment_status` | string(30) null   | `Paid` / `Pending` / `Partial`                  |
| `source_row`     | smallInteger null | Nomor baris asli di Excel                       |

### `project_progress_curves` — S-Curve mingguan

Terikat ke `projects` (bukan `periods`) karena granularitas mingguan tidak align dengan laporan bulanan.
**Unique:** `project_id + week_number`.

| Kolom           | Tipe              | Keterangan                                       |
|-----------------|-------------------|--------------------------------------------------|
| `project_id`    | FK                | → projects                                       |
| `week_number`   | smallInteger      | Nomor minggu proyek                              |
| `week_date`     | date nullable     | Tanggal awal minggu (opsional, untuk x-axis)     |
| `rencana_pct`   | decimal(6,2)      | Progress rencana kumulatif (%)                   |
| `realisasi_pct` | decimal(6,2)      | Progress realisasi kumulatif (%)                 |
| `deviasi_pct`   | decimal(7,2)      | realisasi − rencana (negatif = terlambat)        |
| `keterangan`    | string(100) null  | Catatan, contoh "Material Delay"                 |

### `project_risks` — Risk register (input manual)

Tidak di-ingest dari Excel. Input manual saja.

| Kolom                 | Tipe              | Keterangan                                       |
|-----------------------|-------------------|--------------------------------------------------|
| `project_id`          | FK                | → projects                                       |
| `risk_code`           | string(20) null   | Contoh: `RSK-001`                                |
| `risk_title`          | string(255)       | Judul singkat risiko                             |
| `risk_description`    | text nullable     | Deskripsi lengkap                                |
| `category`            | string(50) null   | `cost`/`schedule`/`quality`/`safety`/`scope`/`external` |
| `financial_impact_idr`| decimal(20,2)     | Estimasi dampak finansial (IDR)                  |
| `probability`         | tinyInteger null  | 1–5                                              |
| `impact`              | tinyInteger null  | 1–5                                              |
| `severity`            | string(20) null   | Auto: `low`/`medium`/`high`/`critical`           |
| `mitigation`          | text nullable     | Rencana mitigasi                                 |
| `status`              | string(20)        | `open`/`mitigated`/`closed`/`monitoring`         |
| `owner`               | string(100) null  | PIC yang bertanggung jawab                       |
| `identified_at`       | date nullable     |                                                  |
| `target_resolved_at`  | date nullable     |                                                  |

### `column_aliases` — Manajemen alias kolom Excel

Admin bisa tambah alias via UI tanpa deploy ulang. Seeder otomatis mengisi dari `WorkbookFieldMapper::BUILTIN_ALIASES`.
**Unique:** `alias + context`. **Soft delete:** gunakan `is_active = false`.

| Kolom          | Tipe             | Keterangan                                                |
|----------------|------------------|-----------------------------------------------------------|
| `alias`        | string(120)      | Header Excel setelah normalisasi, contoh `rencana_biaya_m`|
| `target_field` | string(80)       | Field standar sistem, contoh `planned_cost`               |
| `context`      | string(30) null  | `project`/`work_item`/`material`/`equipment`/`s_curve` / null=semua |
| `is_active`    | boolean          | False = dinonaktifkan                                     |
| `created_by`   | FK nullable      | → users                                                   |

### `ingestion_files` — Riwayat upload file

| Kolom           | Tipe          | Keterangan                                              |
|-----------------|---------------|---------------------------------------------------------|
| `original_name` | string        | Nama file asli                                          |
| `stored_path`   | string        | Path di disk lokal (`ingestion-files/xxx.xlsx`)         |
| `disk`          | string        | Default `local`                                         |
| `status`        | enum          | `pending`/`processing`/`success`/`failed`/`partial`     |
| `total_rows`    | integer       | Total baris yang diproses                               |
| `imported_rows` | integer       | Baris yang berhasil disimpan                            |
| `skipped_rows`  | integer       | Baris yang dilewati                                     |
| `errors`        | json          | Array pesan error per baris                             |
| `processed_at`  | timestamp     |                                                         |

---

## 3. Business Logic

### KPI Calculation — `KpiCalculatorService`

File: `app/Services/KpiCalculatorService.php`

```
CPI = (progress_pct / 100 × planned_cost) / actual_cost   ← EVM proper (EV/AC)
SPI = planned_duration / actual_duration

Status:
  CPI >= 1 && SPI >= 1    → "good"
  CPI < 0.9 || SPI < 0.9  → "critical"
  otherwise               → "warning"
  input null              → CPI/SPI = null, status = "unknown"
```

**Guard overflow:** jika `|CPI|` atau `|SPI|` > 1000 (indikasi data korup / unit mismatch), disimpan sebagai `null`.

Kalkulasi dipanggil otomatis di `Project::booted()` via event `saving`, sehingga setiap kali project disimpan (create/update), CPI, SPI, dan status ter-update otomatis.

---

## 4. Alur Ingestion — Detail Lengkap

### 4.1 Entry Point

**Route:** `POST /api/projects/upload` (protected, `auth:sanctum`)
**Controller:** `ProjectController::upload()`
**Request:** multipart/form-data, key `files[]` (1–10 file) atau `file` (single)

```
Client → POST /api/projects/upload (files[])
           │
           ├─ Untuk setiap file:
           │    1. Simpan file ke disk lokal: storage/app/ingestion-files/{uuid}.xlsx
           │    2. Buat record IngestionFile  → status: "pending"
           │    3. ingestionFile->markProcessing() → status: "processing"
           │    4. resolveImporter(filePath)  ← deteksi jenis importer
           │    5. importer->import(filePath, ingestionFileId)
           │    6. ingestionFile->markDone()  → status: success/partial/failed
           │
           └─ Return JSON: summary total + per-file results
```

**Status logic `markDone()`:**
- `imported = 0, skipped > 0` → `failed`
- `imported > 0, skipped > 0` → `partial`
- `imported > 0, skipped = 0` → `success`

---

### 4.2 Pemilihan Importer — `resolveImporter()`

File: `ProjectController::resolveImporter()` (line ~485)

```
resolveImporter($filePath):
  1. Coba AdaptiveWorkbookImport::supports($filePath)
       → Load spreadsheet, scan semua sheet
       → Jika ditemukan project_rows (tabel berstruktur dengan project_code)
          ATAU metadata memiliki project_code + project_name
       → return AdaptiveWorkbookImport ✓

  2. Jika Adaptive tidak support:
       Load spreadsheet, hitung sheet count

  3. sheetCount > 1
       → return PolaCImport ✓

  4. sheetCount = 1, scan baris untuk keyword:
       - "budget" + "realisasi" → HPP table ditemukan
       - "vendor"/"supplier" + "material" → material table ditemukan
       Jika salah satu ditemukan → return PolaBImport ✓

  5. Default → return ProjectImport (Pola A) ✓
```

**Prioritas:** Adaptive > Pola C > Pola B > Pola A

---

### 4.3 Layer Mapping Kolom — `WorkbookFieldMapper`

File: `app/Services/WorkbookFieldMapper.php`

Semua importer menggunakan class ini sebagai satu-satunya sumber kebenaran untuk mapping.

**Normalisasi header:**
```
Input: "Rencana Biaya (M)"
→ lowercase:         "rencana biaya (m)"
→ spasi/tanda baca → underscore: "rencana_biaya__m"
→ non-word chars dihapus:        "rencana_biaya_m"
→ trailing underscore dihapus:   "rencana_biaya_m"
Output: "rencana_biaya_m"
```

**Resolusi alias (3 lapis, berurutan):**
```
1. DB: ColumnAlias::allForContext($context)     ← prioritas tertinggi, bisa dikelola admin
2. Builtin: WorkbookFieldMapper::BUILTIN_ALIASES ← 300+ alias hardcoded
3. Passthrough: jika tidak ditemukan, pakai normalized header apa adanya
```

**Context yang didukung:** `project`, `work_item`, `material`, `equipment`, `s_curve`

**Method utama:**
- `normalizeHeader(string)` — normalisasi satu header
- `resolveAlias(string, context)` — resolve satu alias (DB + builtin)
- `resolveHeaders(array, context)` — resolve array header sekaligus
- `findUnrecognized(raw, resolved, context)` — cari kolom yang tidak dikenali
- `parseFieldValue(field, value)` — parse nilai sesuai tipe field
- `parseNumeric(value)` — parse angka termasuk format `(1.234.567)` negatif
- `parsePercentage(value)` — parse `"42,50%"` → `42.5`
- `parsePeriod(string)` — parse `"Maret 2026"` → `"2026-03"`
- `isEmptyRow(array)` — cek apakah baris kosong
- `detectLevel(itemNo, itemName)` — deteksi level hierarki HPP
- `findHeaderRowByKeywords(raw, keywords)` — cari baris header berdasarkan keyword
- `normalizeDivision(value)` — ucwords + validasi enum; null jika tidak cocok

---

### 4.4 Pola A — `ProjectImport` (Flat Tabular)

File: `app/Services/ProjectImport.php`
Target tabel: `projects`

**Cocok untuk:** File Excel sederhana — satu proyek per baris, header di baris pertama.

```
ProjectImport::import($filePath, $ingestionFileId):

  1. PhpSpreadsheet::load($filePath)
  2. sheet->toArray() → $raw (array 2D)

  3. isTransposed($raw)?
       Cek kolom A: apakah ≥50% nilainya cocok dengan field wajib?
       Jika ya → transpose($raw) — balik baris↔kolom
       (untuk file yang field-nya di kolom A, nilai di kolom B)

  4. resolveHeaders($rows[0], 'project')
       → normalisasi + alias lookup (DB + builtin)
       → hasil: ['project_code', 'project_name', 'division', ...]

  5. findUnrecognized() → catat kolom yang tidak terpetakan

  6. validateHeaders(): pastikan 'project_code' dan 'project_name' ada
       → Jika tidak ada → throw ImportValidationException
          (response ke user: "kolom wajib tidak dikenali, tambahkan alias")

  7. Iterasi baris data (array_slice($rows, 1)):
       a. isEmptyRow() → skip
       b. ucwords(strtolower(division)) — normalisasi casing
       c. makeValidator($data) → validasi:
            - project_code: required, max 20 char
            - project_name: required, max 255 char
            - division: nullable, harus enum Division
            - numerics: nullable|numeric|min:0
            - durations: nullable|integer|min:1
       d. Jika gagal → catat error, increment $skipped, skip
       e. Project::updateOrCreate(
              match: ['project_code' => ...]
              fill:  project_name, division, owner, contract_value,
                     planned_cost, actual_cost, planned_duration,
                     actual_duration, progress_pct, project_year,
                     ingestion_file_id
          )
          → Model::saving() otomatis hitung CPI, SPI, status
       f. increment $imported

  8. Return: [total, imported, skipped, errors, unrecognized_columns]
```

---

### 4.5 Pola B — `PolaBImport` (Mixed Layout Single Sheet)

File: `app/Services/PolaBImport.php`
Target tabel: `projects`, `project_periods`, `project_work_items`, `project_material_logs`

**Cocok untuk:** File satu sheet dengan 3 zona berbeda tanpa pemisah eksplisit.

```
Struktur sheet:
  Zona 1 (baris 1–N):   Metadata key-value   → project + period
  Zona 2 (baris N+1–M): Tabel HPP hierarkis  → project_work_items
  Zona 3 (baris M+1–Z): Tabel vendor/material → project_material_logs
```

```
PolaBImport::import($filePath, $ingestionFileId):

  1. sheet->toArray() → $raw

  2. Deteksi batas zona:
       findHeaderRowByKeywords($raw, ['budget','realisasi','deviasi'])
         → $hppHeaderRow (integer|null)
       findHeaderRowByKeywords($raw, ['vendor','material','qty'])
         ?? findHeaderRowByKeywords($raw, ['supplier','material','qty'])
         → $vendorHeaderRow (integer|null)

  3. ZONA 1 — parseMetadata():
       $metaRows = array_slice($raw, 0, $hppHeaderRow ?? count($raw))
       Iterasi setiap baris:
         - Ambil sel non-null: [key, value, ...]
         - key = mapper->resolveAlias($cells[0], 'project')
                ?? mapper->normalizeHeader($cells[0])
         - Switch key → isi $meta['project_code'], ['project_name'], ['contract_value'], dst.
         - Deteksi periode: jika label mengandung "periode"/"bulan"
             → mapper->parsePeriod($cells[1]) → "2026-03"
         - Deteksi progress triplet: jika label "progress" + count(cells) >= 4
             → progress_prev_pct, progress_this_pct, progress_total_pct
       Jika tidak ada project_code → throw RuntimeException

       Project::firstOrCreate(
           match: ['project_code' => $meta['project_code']]
           fill:  project_name, division (nullable), owner,
                  contract_value, planned_cost, actual_cost,
                  planned_duration, actual_duration, progress_pct,
                  project_year, ingestion_file_id
       ) → $project
       → Model::saving() hitung CPI/SPI/status

       ProjectPeriod::updateOrCreate(
           match: ['project_id' => $project->id,
                   'period'     => $meta['period'] ?? now()->format('Y-m')]
           fill:  client_name, project_manager, report_source='file_import',
                  progress_prev_pct, progress_this_pct, progress_total_pct,
                  contract_value, addendum_value, bq_external
       ) → $period

  4. ZONA 2 — parseWorkItems($hppRows, $period->id):
       $hppRows = slice dari $hppHeaderRow sampai $vendorHeaderRow (atau akhir)

       Baris pertama = header:
         mapper->resolveHeaders($rows[0], 'work_item')
         → ['item_no', 'item_name', 'total_budget', 'realisasi', 'deviasi', ...]

       Iterasi baris data:
         - isEmptyRow() → skip
         - item_name kosong → skip
         - detectLevel(item_no, item_name):
             romawi → 0, "1.1.1" → 2, "1.1" → 1, "1" → 0, ALLCAPS → 0
         - parentId = $parentMap[$level - 1] ?? null
         - isTotalRow = nama mengandung "total"/"jumlah"
         - ProjectWorkItem::create([
               period_id, parent_id, level, item_no, item_name, sort_order,
               budget_awal, addendum, total_budget, realisasi,
               deviasi, deviasi_pct, is_total_row
           ])
         - $parentMap[$level] = $item->id  ← track parent per level

  5. ZONA 3 — parseMaterialLogs($vendorRows, $period->id):
       $vendorRows = slice dari $vendorHeaderRow sampai akhir

       Baris pertama = header:
         mapper->resolveHeaders($rows[0], 'material')
         → ['supplier_name', 'material_type', 'qty', 'satuan', ...]

       Iterasi baris data:
         - isEmptyRow() → skip
         - supplier_name + material_type keduanya kosong → skip
         - isDiscount = nama mengandung "discount"/"potongan"
         - ProjectMaterialLog::create([
               period_id, work_item_id=null, supplier_name, material_type,
               qty, satuan, harga_satuan, total_tagihan, is_discount, source_row
           ])

  6. Refresh HPP totals pada period:
       actual_costs   = SUM(total_budget) WHERE parent_id IS NULL AND NOT is_total_row
       realized_costs = SUM(realisasi)    WHERE parent_id IS NULL AND NOT is_total_row
       hpp_deviation  = actual_costs - realized_costs
       period->update([...])

  7. Return: [total, imported, skipped, errors, unrecognized_columns]
```

---

### 4.6 Pola C — `PolaCImport` (Multi-Sheet)

File: `app/Services/PolaCImport.php`
Target tabel: `projects`, `project_periods`, `project_work_items`, `project_material_logs`, `project_equipment_logs`, `project_progress_curves`

**Cocok untuk:** File Excel multi-sheet, tiap sheet = satu jenis data.

```
Deteksi jenis sheet (detectSheetType($name)):
  nama mengandung "cover"/"summary"   → COVER
  nama mengandung "hpp"/"rekap"       → HPP
  nama mengandung "material"          → MATERIAL
  nama mengandung "alat"/"equipment"  → EQUIPMENT
  nama mengandung "curva"/"curve"/"progress" → S_CURVE
```

```
PolaCImport::import($filePath, $ingestionFileId):

  ── PASS 1: Cari sheet COVER terlebih dahulu ──────────────────────────────

  parseCoverSheet($raw, $ingestionFileId):
    Iterasi setiap baris (key-value format):
      - Ambil sel non-null: [key, value, ...]
      - key = mapper->resolveAlias($cells[0], 'project')
             ?? mapper->normalizeHeader($cells[0])
      - Switch key → isi $meta['project_code'], ['project_name'],
                          ['client_name'], ['project_manager'],
                          ['contract_value'], ['addendum_value'],
                          ['progress_total_pct'], ['planned_cost'],
                          ['actual_cost'], ['planned_duration'],
                          ['actual_duration'], ['project_year']
      - Deteksi periode: label mengandung "periode"/"bulan"
          → mapper->parsePeriod($val) → "2026-03"
    Jika tidak ada project_code → throw RuntimeException

    Project::firstOrCreate([project_code => ...], [
        project_name, division=null, owner, contract_value,
        planned_cost, actual_cost, planned_duration,
        actual_duration, progress_pct, project_year, ingestion_file_id
    ]) → $project

    ProjectPeriod::updateOrCreate([project_id, period], [
        client_name, project_manager, report_source='file_import',
        progress_total_pct, contract_value, addendum_value, bq_external
    ]) → $period

  Jika project/period null setelah Pass 1 → throw RuntimeException

  ── PASS 2: Proses sheet lainnya dengan $project dan $period ──────────────

  parseHppSheet($raw, $period->id):
    findHeaderRowByKeywords($raw, ['realisasi','budget'])
      ?? findHeaderRowByKeywords($raw, ['realisasi','anggaran'])
    mapper->resolveHeaders($raw[$headerIdx], 'work_item')
    Iterasi baris data → ProjectWorkItem::create([...])
    Logic level/parent sama dengan Pola B

  parseMaterialSheet($raw, $period->id):
    findHeaderRowByKeywords($raw, ['supplier','material','qty'])
      ?? findHeaderRowByKeywords($raw, ['vendor','material','satuan'])
    mapper->resolveHeaders($raw[$headerIdx], 'material')
    Iterasi baris → ProjectMaterialLog::create([...])

  parseEquipmentSheet($raw, $period->id):
    findHeaderRowByKeywords($raw, ['vendor','alat','jam'])
      ?? findHeaderRowByKeywords($raw, ['vendor','equipment','jam'])
    mapper->resolveHeaders($raw[$headerIdx], 'equipment')

    $lastVendor = null  ← forward-fill state
    Iterasi baris:
      - vendorName kosong? → pakai $lastVendor ?? 'Unknown'
      - vendorName tidak kosong? → update $lastVendor
      - equipment_name kosong → skip
      - ProjectEquipmentLog::create([
            period_id, vendor_name, equipment_name,
            jam_kerja, rate_per_jam, total_biaya, payment_status, source_row
        ])

  parseSCurveSheet($raw, $project->id):
    findHeaderRowByKeywords($raw, ['minggu','rencana','realisasi'])
      ?? findHeaderRowByKeywords($raw, ['week','rencana','realisasi'])
    mapper->resolveHeaders($raw[$headerIdx], 's_curve')
    Iterasi baris:
      - week_number <= 0 → skip
      - rencana   = mapper->parsePercentage(...)  ← handle "42,50%" → 42.5
      - realisasi = mapper->parsePercentage(...)
      - deviasi   = parsePercentage() ?? (realisasi - rencana)
      - ProjectProgressCurve::updateOrCreate(
            match: [project_id, week_number]
            fill:  rencana_pct, realisasi_pct, deviasi_pct, keterangan
        )

  Refresh HPP totals → period->update([actual_costs, realized_costs, hpp_deviation])

  Return: [total, imported, skipped, errors, unrecognized_columns]
```

---

### 4.7 Pola Adaptive — `AdaptiveWorkbookImport` (Intelligent Scanner)

File: `app/Services/AdaptiveWorkbookImport.php`
Target tabel: semua tabel di atas (sama seperti Pola C)

**Cocok untuk:** File dengan layout tidak standar — metadata berserakan di berbagai tempat, atau
tidak mengikuti format Pola A/B/C. Importer ini mencoba **menemukan sendiri** data dari manapun
dalam workbook.

```
AdaptiveWorkbookImport::import($filePath, $ingestionFileId):

  ── PHASE 1: discoverWorkbook() ───────────────────────────────────────────

  Iterasi setiap sheet:

  A) collectMetadataCandidates($raw, $sheetName):
     Untuk setiap baris, cari 3 strategi:

     Strategi 1 — Paired Cells (base score 100):
       Sel ganjil = label, sel genap = nilai
       Jika resolveAlias(label, 'project') berhasil → simpan sebagai kandidat

     Strategi 2 — Colon Separated (base score 92):
       Sel mengandung ":" → split label:nilai
       Jika resolveAlias(label, 'project') berhasil → simpan sebagai kandidat

     Strategi 3 — Progress Triplet (base score 96):
       Baris mengandung "progress" + 4 kolom
       → progress_prev_pct, progress_this_pct, progress_total_pct

     Tiap kandidat mendapat score:
       score = base_score + sheet_bonus + quality_bonus
       sheet_bonus: +5 jika sheet bernama cover/summary/info/meta
       quality_bonus: dari confidenceAdjustment() per tipe field
         - project_code bertipe kode (XX-999) → +20
         - division cocok enum → +18
         - nilai positif → +6
         - persentase 0–100 → +8
         - text pendek → +1 s/d +4
         - null/kosong → -100

     Tiap field hanya disimpan kandidat dengan score tertinggi.

  B) discoverProjectRows($raw, $sheetName):
     Untuk setiap baris, coba sebagai header:
       resolveHeaders(headerRow, 'project')
       isProjectHeader(): knownMatches >= 4 AND ada project_code AND project_name
     Jika cocok → extractRows() dari baris berikutnya:
       - isEmptyRow → increment streak; >= 2 berturut → stop
       - parseFieldValue() per field
       - simpan sebagai project row candidate

  C) discoverTableRows($raw, $sheetName, $context):
     Sama seperti B tapi untuk work_item, material, equipment, s_curve
     isMatchesStructuredHeader() per context:
       work_item:  >= 3 known fields + item_name + (budget_awal|total_budget|realisasi)
       material:   >= 3 known fields + material_type + (supplier_name|qty)
       equipment:  >= 3 known fields + equipment_name
       s_curve:    >= 3 known fields + week_number + (rencana_pct|realisasi_pct)

  ── PHASE 2: finalizeMetadata() ───────────────────────────────────────────

  Untuk setiap field:
    - Ambil kandidat dengan score tertinggi sebagai nilai final
    - Jika ada >1 nilai berbeda → simpan ke field_conflicts (audit trail)
    - Catat field_trace: [value, sheet, row, confidence, strategy]

  Derivasi otomatis (jika field tidak ditemukan):
    - bq_external = contract_value + addendum_value
    - progress_pct ← progress_total_pct
    - owner ← client_name

  ── PHASE 3: persistProjects() ────────────────────────────────────────────

  Jika tidak ada project_rows → gunakan metadata sebagai satu project row

  Untuk tiap project row:
    assembleProjectData():
      combined = merge(metadata ∩ knownFields, row ∩ knownFields)
      → row field override metadata field (row lebih spesifik)
      normalizeProjectData() → parse semua field sesuai tipe
      applyDerivedProjectDefaults():
        - contract_value ← bq_external jika tidak ada
        - planned_cost ← SUM(level-0 total_budget dari work_items)
        - actual_cost  ← SUM(level-0 realisasi dari work_items)
        - planned_duration ← ceil(max_week_number / 4) dari s_curves
        - actual_duration  ← sama
        - progress_pct ← realisasi_pct terakhir dari s_curves
        - division: normalizeDivision() → null jika tidak cocok enum
          → inferDivision() dari keyword project_name/owner/work_items:
              "gedung", "rsud", "tower" → "Building"
              "jalan", "jembatan", "tol" → "Infrastructure"
              ada work_items/materials/equipments → "Building" (default)

    makeProjectValidator():
      project_code: required
      project_name: required
      division/financials/durations: nullable
    Jika gagal → catat error, skip baris ini

    Project::updateOrCreate([project_code], [...]) → $project
    → Model::saving() hitung CPI/SPI/status

  Jika $projects kosong setelah semua baris → throw ImportValidationException

  ── PHASE 4: Sync data relasional ─────────────────────────────────────────

  upsertPeriod($project, $metadata, $ingestionFileId):
    ProjectPeriod::updateOrCreate([project_id, period], [
        client_name, project_manager, report_source='adaptive_scan',
        progress_prev_pct, progress_this_pct, progress_total_pct,
        contract_value, addendum_value, bq_external
    ]) → $period

  syncWorkItems($period, $payload['work_items']):
    period->workItems()->delete()  ← hapus dulu (full replace)
    Iterasi → detectLevel() → ProjectWorkItem::create([...])

  syncMaterialLogs($period, $payload['materials']):
    period->materialLogs()->delete()
    Iterasi → ProjectMaterialLog::create([...])

  syncEquipmentLogs($period, $payload['equipments']):
    period->equipmentLogs()->delete()
    lastVendor = null (forward-fill)
    Iterasi → ProjectEquipmentLog::create([...])

  syncSCurves($project, $payload['s_curves']):
    Iterasi → ProjectProgressCurve::updateOrCreate([project_id, week_number], [...])

  refreshPeriodTotals($period):
    Recalculate actual_costs, realized_costs, hpp_deviation

  ── RETURN ────────────────────────────────────────────────────────────────

  Return: {
    total, imported, skipped, errors, warnings,
    scanner: 'adaptive',
    field_trace,       ← nilai terpilih per field + confidence + asal sheet/baris
    field_candidates,  ← semua kandidat per field, sorted by confidence
    field_conflicts,   ← field yang punya >1 nilai berbeda + alasan pemilihan
    project_row_trace, ← per-project: sheet, baris, field yang dipakai
    project_row_conflicts ← project_code yang muncul di >1 tempat dengan data beda
  }
```

---

## 5. API Endpoints

### Public (tanpa auth)

```
GET  /api/projects                        → list proyek + filter (division, status, year, contract_range)
GET  /api/projects/{id}                   → detail proyek
GET  /api/projects/summary                → dashboard macro (total, avg CPI/SPI, count by status)
GET  /api/projects/{id}/insight           → bullet points analitik CPI/SPI + perbandingan divisi

GET  /api/projects/{id}/periods           → list laporan bulanan proyek
GET  /api/projects/{id}/periods/{period}  → detail satu periode (YYYY-MM)
GET  /api/periods/{id}/work-items         → HPP hierarkis periode
GET  /api/periods/{id}/materials          → log material periode
GET  /api/periods/{id}/equipment          → log alat berat periode
GET  /api/projects/{id}/progress-curve   → data S-Curve semua minggu
GET  /api/projects/{id}/risks             → risk register proyek

GET  /api/ingestion-files                 → riwayat upload
GET  /api/ingestion-files/{id}/download  → download file asli

GET  /api/column-aliases                  → list alias aktif (bisa filter by context)
GET  /api/column-aliases/{id}             → detail satu alias
```

### Protected (auth:sanctum)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

POST   /api/projects                      → create manual
PUT    /api/projects/{id}                 → update
DELETE /api/projects/{id}                 → delete

POST   /api/projects/upload               → upload 1–10 file Excel
POST   /api/ingestion-files/{id}/reprocess → reprocess file yang gagal

POST   /api/projects/{id}/risks           → tambah risk
PUT    /api/projects/{id}/risks/{riskId}  → update risk
DELETE /api/projects/{id}/risks/{riskId}  → delete risk

POST   /api/column-aliases                → tambah alias baru
PUT    /api/column-aliases/{id}           → update alias
DELETE /api/column-aliases/{id}           → soft delete (is_active = false)
```

---

## 6. File Structure Penting

```
app/
├── Enums/
│   └── Division.php                  ← enum: Infrastructure | Building
├── Exceptions/
│   └── ImportValidationException.php ← exception khusus upload (bawa unrecognized_columns)
├── Http/Controllers/
│   ├── AuthController.php
│   ├── ProjectController.php         ← upload, reprocess, insight, summary
│   ├── ProjectPeriodController.php
│   ├── WorkItemController.php
│   ├── MaterialLogController.php
│   ├── EquipmentLogController.php
│   ├── ProgressCurveController.php
│   ├── ProjectRiskController.php
│   └── ColumnAliasController.php
├── Models/
│   ├── Project.php                   ← booted(): auto-compute CPI/SPI/status
│   ├── ProjectPeriod.php
│   ├── ProjectWorkItem.php           ← self-referencing
│   ├── ProjectMaterialLog.php
│   ├── ProjectEquipmentLog.php
│   ├── ProjectProgressCurve.php
│   ├── ProjectRisk.php
│   ├── IngestionFile.php
│   ├── ColumnAlias.php               ← resolveAlias(), allForContext()
│   └── User.php
└── Services/
    ├── WorkbookFieldMapper.php       ← SINGLE SOURCE OF TRUTH untuk mapping
    ├── ProjectImport.php             ← Pola A: flat tabular
    ├── PolaBImport.php               ← Pola B: mixed zones single sheet
    ├── PolaCImport.php               ← Pola C: multi-sheet
    ├── AdaptiveWorkbookImport.php    ← Pola Adaptive: intelligent scanner
    └── KpiCalculatorService.php      ← CPI, SPI, status

database/migrations/
    2026_02_22_..._create_projects_table
    2026_03_03_..._create_ingestion_files_table
    2026_03_03_..._add_ingestion_file_id_to_projects
    2026_03_05_..._add_project_year_to_projects
    2026_03_30_..._add_indexes_to_projects_table
    2026_03_30_..._create_project_periods_table
    2026_03_30_..._create_project_work_items_table
    2026_03_30_..._create_project_material_logs_table
    2026_03_30_..._create_project_equipment_logs_table
    2026_03_30_..._create_project_progress_curves_table
    2026_03_30_..._create_project_risks_table
    2026_03_30_..._create_column_aliases_table
    2026_04_06_000000_make_project_financial_fields_nullable   ← division/cost/duration nullable
    2026_04_06_000001_widen_cpi_spi_columns                   ← decimal(10,4) → decimal(20,4)
```

---

## 7. Tim

| Role                 | Nama            |
|----------------------|-----------------|
| Project Manager      | Farah A         |
| UI/UX Designer       | Rista           |
| Engineer             | Fauzan & Haydar |
| Associate Consultant | Fikri           |

**Timeline:** 14–16 hari kerja

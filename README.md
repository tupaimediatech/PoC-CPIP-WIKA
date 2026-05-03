# PoC CPIP-WIKA

> **CPIP** (Construction Project Impact Platform), a PoC for PT Wijaya Karya (WIKA) that ingests Excel project data, calculates KPI metrics (CPI/SPI), and presents dashboards with actionable insights.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Data Ingestion Pipeline](#3-data-ingestion-pipeline)
4. [Database Design](#4-database-design)
5. [ERD (Entity Relationship Diagram)](#5-erd-entity-relationship-diagram)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [API Reference](#7-api-reference)
8. [Setup & Operations](#8-setup--operations)
9. [Assumptions & Known Gaps](#9-assumptions--known-gaps)

---

## 1. Project Overview

### Purpose

CPIP enables WIKA project managers to upload Excel workbooks containing project cost, schedule, and vendor data. The system automatically parses diverse spreadsheet formats, calculates Earned Value metrics (CPI/SPI), and surfaces construction project health on an interactive dashboard.

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Excel Ingestion** | Upload single or multi-sheet Excel files; auto-detect layout pattern |
| **KPI Calculation** | CPI (Cost Performance Index) and SPI (Schedule Performance Index) auto-calculated on every save |
| **Dashboard** | Summary KPIs, division/SBU breakdown, risk overview, S-curve visualization |
| **Drill-down Hierarchy** | Project → WBS Phase → Work Item → Vendor/Material detail |
| **Column Alias Mapping** | User-configurable header aliases for non-standard Excel templates |
| **Per-user Data Isolation** | Each user's uploaded data is scoped to their account |

### Monorepo Structure

```
PoC-CPIP-WIKA/
└── apps/
    ├── api/          # Laravel 12 (PHP 8.3) for REST API backend
    └── web/          # Next.js 16 (React 19, TypeScript) for frontend
```

### Key Use Cases

1. **Upload Excel** → System detects format, parses data, calculates KPIs
2. **View Dashboard** → Average CPI/SPI, status breakdown by division, top overrun projects
3. **Drill into Project** → Phase-level budgets → Work item costs → Vendor contract details
4. **Manage Column Aliases** → Map non-standard header names without code changes
5. **Risk Register** → Track project risks with probability/impact scoring

---

## 2. Backend Architecture

### Folder Structure

```
apps/api/app/
├── Enums/
│   └── Division.php              # Infrastructure | Building
├── Exceptions/
│   └── ImportValidationException.php  # Thrown when Excel headers invalid
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php         # Login, register, logout, me
│   │   ├── ProjectController.php      # CRUD, upload, summary, insight (12 methods)
│   │   ├── ProjectWbsController.php   # WBS phase listing & detail
│   │   ├── WorkItemController.php     # Work items & HPP summary
│   │   ├── MaterialLogController.php  # Material logs by phase/item
│   │   ├── EquipmentLogController.php # Equipment logs by phase/item
│   │   ├── ProgressCurveController.php # S-curve data
│   │   ├── ProjectRiskController.php  # Risk CRUD
│   │   ├── ColumnAliasController.php  # Alias management
│   │   ├── HarsatController.php       # Unit rate trends
│   │   └── RoleController.php         # Role assignment
│   └── Requests/
│       ├── ProjectRequest.php         # Project validation rules
│       └── UploadExcelRequest.php     # File upload validation
├── Models/
│   ├── User.php                  # Sanctum tokens, role field
│   ├── Project.php               # Core entity, auto-KPI via boot hook
│   ├── ProjectWbs.php            # WBS phases (formerly project_periods)
│   ├── ProjectWorkItem.php       # Hierarchical work breakdown items
│   ├── ProjectMaterialLog.php    # Vendor material records
│   ├── ProjectEquipmentLog.php   # Equipment usage records
│   ├── ProjectProgressCurve.php  # S-curve data points
│   ├── ProjectRisk.php           # Risk register, auto-severity
│   ├── ProjectVendor.php         # Extended vendor master (sheet 7)
│   ├── ProjectIndirectCostItem.php # Indirect cost line items (sheet 3)
│   ├── ProjectOtherCostItem.php  # Other cost line items (sheet 4)
│   ├── IngestionFile.php         # Upload tracking & status
│   ├── ColumnAlias.php           # User-defined header aliases
│   └── HarsatHistory.php         # Unit rate history
├── Services/
│   ├── EpcStandardImport.php     # **Primary**: WIKA EPC 7-sheet workbook parser
│   ├── FinancialSummaryAggregator.php # Rebuilds Level 3 P&L tables after import
│   ├── DivisionResolver.php      # Infers division from project_code prefix
│   ├── ProjectImport.php         # Pola A: flat single-sheet parser (legacy)
│   ├── PolaBImport.php           # Pola B: mixed-layout single-sheet (legacy)
│   ├── PolaCImport.php           # Pola C: multi-sheet structured (legacy)
│   ├── AdaptiveWorkbookImport.php # Adaptive fallback with confidence scoring
│   ├── WorkbookFieldMapper.php   # Header normalization & 150+ aliases
│   └── KpiCalculatorService.php  # CPI/SPI calculation engine
└── Providers/
    └── AppServiceProvider.php
```

### Request Flow

```mermaid
flowchart LR
    Browser --> Next["`Next.js (/api/*)`"]
    Next --> Laravel["`Laravel (Auth, Logic, Model)`"]
    Laravel --> DB["`SQLite/PostgreSQL`"]
    DB --> JSON["`JSON Response`"]
    JSON --> Next2["`Next.js`"]
    Next2 --> Browser
```

### Authentication & Authorization

- **Laravel Sanctum** bearer-token auth. Tokens are returned from `POST /api/auth/login` and sent as `Authorization: Bearer <token>` on subsequent calls.
- **Multi-device sessions** — up to **3** concurrent tokens per user. When a 4th login arrives, the oldest token (by `last_used_at`, then `created_at`) is pruned automatically.
- **Remember Me** — `remember=true` issues a **30-day** token; `remember=false` (default) issues a **12-hour** token. The TTL is enforced by Sanctum's `expires_at`.
- **Device metadata** — each token stores `ip_address`, `user_agent`, and `remember` so the user can review and revoke sessions via `GET/DELETE /api/auth/sessions`.
- **Shared data model** — projects and ingestion files are **not** per-user scoped. Any authenticated user can see and reprocess everyone's uploads (single shared corpus for the PoC).
- Roles: `admin` and `user` (stored in `users.role`).

```mermaid
flowchart LR
    A[POST /api/auth/login] --> B{remember?}
    B -->|true| C[expires_at = now + 30d]
    B -->|false| D[expires_at = now + 12h]
    C --> E[pruneOldSessions MAX=3]
    D --> E
    E --> F[createToken with ip + user_agent + remember]
    F --> G[Return token + expires_at + user]
```

### Key Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Service Layer** | `app/Services/` | Business logic separated from controllers |
| **Boot Hook Auto-KPI** | `Project::booted()` | CPI/SPI recalculated on every `Project::save()` |
| **Boot Hook Auto-Severity** | `ProjectRisk::booted()` | Risk severity = probability × impact |
| **Strategy Pattern** | `resolveImporter()` | Selects correct parser based on file structure |
| **Session Cap** | `AuthController::pruneOldSessions()` | Max 3 active Sanctum tokens per user, oldest pruned on 4th login |
| **Alias Resolution** | `WorkbookFieldMapper` | Builtin + DB aliases decouple import from header naming |
| **Forward-Fill** | `PolaCImport::parseEquipmentSheet()` | Handles merged cells in equipment vendor column |

---

## 3. Data Ingestion Pipeline

### Overview

The ingestion pipeline accepts Excel files (.xlsx/.xls), auto-detects the layout pattern, normalizes headers via 150+ aliases, validates data, and upserts into the database. KPIs are auto-calculated on every project save.

### Upload Entry Point

```
POST /api/projects/upload
Content-Type: multipart/form-data
Body: file=@workbook.xlsx (or files[]=@file1.xlsx&files[]=@file2.xlsx)
```

**Controller**: `ProjectController::upload()` handles:
1. Store file to `storage/app/ingestion-files/`
2. Create `IngestionFile` record (status: `pending` → `processing`)
3. Call `resolveImporter($filePath)` to select parser
4. Execute `$importer->import($filePath, $ingestionFileId)`
5. Update `IngestionFile` status (`success` / `failed` / `partial`)
6. Return JSON with counts, errors, affected projects

### Importer Selection Logic

```mermaid
flowchart TD
    A["resolveImporter(filePath)"]

    A --> B{"EpcStandardImport::supports()?"}
    B -- YES --> C["EpcStandardImport"]
    B -- NO --> D{"sheetCount > 1?"}

    D -- YES --> E["PolaCImport (multi-sheet structured, legacy)"]
    D -- NO --> F{"AdaptiveWorkbookImport::supports()?"}

    F -- YES --> G["AdaptiveWorkbookImport (flexible fallback)"]
    F -- NO --> H{"Has HPP/vendor table markers?"}

    H -- YES --> I["PolaBImport (mixed-layout single sheet, legacy)"]
    H -- NO --> J["ProjectImport (flat tabular, legacy)"]
```

### Importer Details

#### `EpcStandardImport` for Primary WIKA EPC Workbook (7 sheets)

**File**: `app/Services/EpcStandardImport.php`

**When selected**: Workbook contains both `Project Metadata` and `WBS Data` sheets (case-insensitive). This is the "expected" WIKA template.

**Input format**: Up to 7 named sheets, each independent and optional except the first two:

| # | Sheet Name (case-insensitive) | Layout | Target Tables | Required |
|---|-------------------------------|--------|---------------|----------|
| 1 | `Project Metadata` | Vertical key→value | `projects` | Yes |
| 2 | `WBS Data` | Flat WBS table (~25 cols) | `project_wbs`, `project_work_items` | Yes |
| 3 | `Indirect Cost` | sub_kategori × budget/realisasi | `project_indirect_cost_items` | optional |
| 4 | `Other Cost` | Other Cost table + P&L Footer | `project_other_cost_items`, `projects.tarif_pph_final` | optional |
| 5 | `Progress Curve` | Monthly S-curve | `project_progress_curves` | optional |
| 6 | `Risk Register` | Risk catalog | `project_risks` | optional |
| 7 | `Vendor Detail` | Extended vendor master | `project_vendors` | optional |

Missing optional sheets emit a warning, not a failure.

**Processing**:
1. **`Project Metadata`** = vertical key→value pairs parsed into a lowercased map. `Project::updateOrCreate()` keyed on `project_code`. Missing `division` falls back to `DivisionResolver::fromCode()`.
2. **`WBS Data`** = top-level rows (Roman `Nomor` without dots, e.g. `I`, `II`) become `ProjectWbs` phases; child rows (`I.1`, `I.2.1`) become `ProjectWorkItem` rows linked via `period_id`. Existing phases for the project are wiped first for **idempotent re-import**.
3. **`Indirect Cost` / `Other Cost`** = header row located by keyword scan (handles 1–3 banner rows above). Rows starting with `total` / `subtotal` are skipped. Other Cost also extracts `tarif pph final` from a P&L footer table.
4. **`Progress Curve`** = one `ProjectProgressCurve` row per month, `week_number` synthesized as 1, 2, 3…
5. **`Risk Register`** = qualitative `low|medium|high|critical` mapped to `1, 3, 4, 5` for probability/impact.
6. **`Vendor Detail`** = vendor master keyed by `(project_id, po_number)`. Joined back to work items by the Level 6 page to surface `lokasi`, `npwp`.
7. **Aggregates** = `recomputeProjectAggregates()` recomputes `planned_cost` / `actual_cost` (incl. indirect + other cost) on the project, then `FinancialSummaryAggregator` rebuilds the Level 3 P&L summary tables.

**EVM & vendor formulas (computed on import, per child work item)**:

| Field | Formula |
|---|---|
| Nilai Budget | `volume × harga_satuan` |
| Nilai Aktual | `volume_aktual × harsat_aktual` |
| `planned_value` (PV) | `Nilai Budget × progress_plan` |
| `earned_value` (EV) | `Nilai Budget × progress_actual` |
| `actual_cost_item` (AC) | `Nilai Aktual` |
| `retention` | `vendor_contract_value × 0.05` (Retensi 5%) |
| `outstanding_debt` | `vendor_contract_value × 0.95 − termin_paid` (Sisa Hutang) |
| `total_budget` | `(volume + volume_addendum) × harga_satuan` |
| `realisasi` | `volume_aktual × harsat_aktual` |

**Percentage handling**: `progress_plan_pct`, `progress_actual_pct`, `bobot_pct` are parsed via `percent()` — values `≤ 1.5` are treated as fractions (`0.87` → `87.00`), `> 1.5` as already-percent (`87` → `87.00`). This avoids the common bug where Excel-stored fractions render as `1.0%`.

**Number parsing**: `numeric()` understands both Indonesian (`1.250.000,50`) and US (`1,250,000.50`) formats and strips currency labels.

**Error handling**: Per-sheet exceptions are caught, logged to `errors[]`, and processing continues with the next sheet. Per-row WBS errors (e.g., orphaned child without parent phase) collected but do not abort.

---

#### Pola A: `ProjectImport` for Flat Tabular Single-Sheet (legacy)

**When selected**: Default fallback for simple project lists.

**Input format**: Single sheet, row 1 = headers, rows 2+ = one project per row.

**Processing**:
1. Detect if transposed (headers in column A instead of row 1) → transpose if needed
2. Normalize headers via `WorkbookFieldMapper::resolveHeaders()`
3. Validate required columns: `project_code`, `project_name`
4. For each data row:
   - Skip empty rows
   - Validate via Laravel Validator (division enum, numeric ranges, etc.)
   - `Project::updateOrCreate()` keyed on `project_code`

**Tables written**: `projects`

**Error handling**: Row-level validation errors collected as `"Baris {N}: {error}"`. Missing required columns throw `ImportValidationException`.

---

#### Pola B: `PolaBImport` for Mixed-Layout Single Sheet (3 Zones, legacy)

**When selected**: Single sheet with both HPP table markers (`budget`, `realisasi`, `deviasi`) AND vendor table markers (`vendor`/`supplier`, `material`, `qty`).

**Input format**: One sheet with 3 vertical zones:
```
┌─────────────────────────────────────────┐
│ ZONA 1: Metadata (key-value pairs)      │  rows 1-N
│   project_code, project_name, manager   │
├─────────────────────────────────────────┤
│ ZONA 2: HPP Table (hierarchical)        │  starts at HPP header row
│   Nomor | Kategori | Budget | Realisasi │
├─────────────────────────────────────────┤
│ ZONA 3: Vendor/Material Table           │  starts at vendor header row
│   No | Vendor | Material | Qty | Harga  │
└─────────────────────────────────────────┘
```


**Processing**:
1. Detect zone boundaries via `findHeaderRowByKeywords()`
2. **Zona 1**: Parse key-value metadata → create `Project` + single `ProjectWbs`
3. **Zona 2**: Parse hierarchical work items → create `ProjectWorkItem` records with parent-child via `detectLevel()`
4. **Zona 3**: Parse material logs → create `ProjectMaterialLog` records
5. Recalculate HPP totals on the WBS phase

**Tables written**: `projects`, `project_wbs`, `project_work_items`, `project_material_logs`

---

#### Pola C: `PolaCImport` for Multi-Sheet Structured (legacy)

**When selected**: File has more than 1 sheet.

**Input format**: Multiple sheets, each with a specific purpose:

| Sheet Name Keywords | Type | Target Table |
|---------------------|------|-------------|
| `cover`, `summary`, `ringkasan` | COVER | `projects` + `project_wbs` (multiple phases) |
| `hpp`, `rekap`, `biaya`, `detail` | HPP | `project_work_items` |
| `material`, `vendor`, `keuangan` | MATERIAL | `project_material_logs` |
| `alat`, `equipment` | EQUIPMENT | `project_equipment_logs` |
| `curva`, `curve`, `progress`, `earned` | S_CURVE | `project_progress_curves` |

**Processing** (2-pass):

**Pass 1: COVER sheet**:
1. Parse metadata from first ~6 rows (multi-pair format: A:B, C:D, E:F, G:H per row)
2. Create/update `Project`
3. Parse summary table (rows after header) → create **one `ProjectWbs` per Roman-numeral row** (I, II, III...XII)
4. Return `[$project, $phaseMap]` where `$phaseMap = ['I' => ProjectWbs, 'II' => ProjectWbs, ...]`

**Pass 2: Remaining sheets**:
- **HPP Sheet**: Resolve headers, iterate work items. Route each item to correct WBS phase by matching Roman prefix in WBS code (e.g., `I.1` → Phase I, `XII.2` → Phase XII). Create `ProjectWorkItem` with correct `period_id`.
- **Material Sheet**: Parse vendor/material rows → `ProjectMaterialLog`
- **Equipment Sheet**: Parse with forward-fill on `vendor_name` (handles merged cells) → `ProjectEquipmentLog`
- **S-Curve Sheet**: Two sub-formats:
  - *Weekly*: `minggu`, `rencana`, `realisasi` headers → `ProjectProgressCurve` per week
  - *Earned Value*: Group by Roman prefix, aggregate weighted progress → `ProjectProgressCurve`

**Tables written**: `projects`, `project_wbs` (multiple), `project_work_items`, `project_material_logs`, `project_equipment_logs`, `project_progress_curves`

---

#### `AdaptiveWorkbookImport` for Flexible Fallback

**When selected**: Single sheet that passes `supports()` check (finds project metadata or project rows via content scanning).

**Input format**: Anything that doesn't match other patterns like scattered metadata, mixed tables, partial data.

**Key capabilities**:
- Scans entire sheet for metadata candidates with confidence scoring
- Discovers table zones dynamically (work items, materials, equipment, S-curve)
- Splits single catch-all WBS phase into multiple phases if Roman-numeral hierarchy detected
- Derives missing values (costs from work item sums, duration from S-curve length)
- Infers division from keywords (`jembatan`/`tol` → Infrastructure, `gedung`/`tower` → Building)
- Auto-generates sample risks if none exist

**Tables written**: All tables (projects, WBS, work items, materials, equipment, progress curves, risks)

---

### `WorkbookFieldMapper` for Header Normalization Engine

**File**: `app/Services/WorkbookFieldMapper.php`

The mapper is used by all importers to translate diverse Excel header names into canonical field names.

#### Normalization Pipeline

```mermaid
flowchart TD
    N1["`**Raw Header**
Nilai Budget (Juta Rp)`"]

    N2["`**Normalize Text**
nilai budget (juta rp)`"]

    N3["`**Remove Units**
nilai budget`"]

    N4["`**Format Key**
nilai_budget`"]

    N5["`**Clean Key (remove non-word chars)**
nilai_budget`"]

    N6["`**Resolve Alias**
total_budget`"]

    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

#### Alias Contexts

Each context has its own set of known fields and alias mappings:

| Context | Known Fields | Example Aliases |
|---------|-------------|-----------------|
| `project` | project_code, project_name, division, sbu, owner, contract_value, planned_cost, actual_cost, planned_duration, actual_duration, progress_pct, project_year, ... | `kode_proyek` → project_code, `nama_proyek` → project_name, `nilai_kontrak` → contract_value, `pemberi_tugas` → client_name |
| `work_item` | item_no, item_name, budget_awal, total_budget, realisasi, deviasi, bobot_pct, progress_plan_pct, progress_actual_pct, planned_value, earned_value, vendor_name, ... | `uraian_pekerjaan` → item_name, `wbs` → item_no, `kategori` → cost_category, `pv_bcws` → planned_value, `ev_bcwp` → earned_value |
| `material` | supplier_name, material_type, qty, satuan, harga_satuan, total_tagihan, ... | `vendor` → supplier_name, `lingkup_pekerjaan` → material_type, `nilai_kontrak` → total_tagihan |
| `equipment` | vendor_name, equipment_name, jam_kerja, rate_per_jam, total_biaya, payment_status | `alat_berat` → equipment_name, `hour_meter` → jam_kerja |
| `s_curve` | week_number, rencana_pct, realisasi_pct, deviasi_pct, keterangan | `minggu_ke` → week_number |

**DB Aliases**: Users can add custom aliases at runtime via the Column Alias management UI. These are stored in the `column_aliases` table and merged with builtin aliases at resolution time.

#### Utility Methods

| Method | Purpose |
|--------|---------|
| `parseNumeric($val)` | Handles both `2,800.50` (international) and `2.800,50` (Indonesian) formats |
| `parsePercentage($val)` | Strips `%`, handles `42,50%` → `42.5` |
| `parsePeriod($val)` | `"Maret 2026"` → `"2026-03"` (Indonesian month names supported) |
| `detectLevel($itemNo, $itemName)` | `"I"` → 0, `"I.1"` → 1, `"I.1.1"` → 2, ALL_CAPS → 0 |
| `findHeaderRowByKeywords($raw, $keywords)` | Scans rows for one containing all keywords |
| `isEmptyRow($row)` | True if all cells null/empty |

---

### KPI Calculation

**File**: `app/Services/KpiCalculatorService.php`

Auto-triggered on every `Project::save()` via the model's boot hook.

#### Formulas

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **CPI** | `EarnedValue / ActualCost` where `EV = (progress% / 100) × PlannedCost` | > 1.0 = under budget, < 1.0 = over budget |
| **SPI** | `PlannedDuration / ActualDuration` | > 1.0 = ahead of schedule, < 1.0 = behind |

#### Status Determination

| Status | Condition |
|--------|-----------|
| `critical` | CPI < 0.9 **OR** SPI < 0.9 |
| `good` | CPI >= 1.0 **AND** SPI >= 1.0 |
| `warning` | Everything else (mixed results) |
| `unknown` | CPI or SPI is null (insufficient data) |

#### Safeguards

- Returns `null` if inputs are null or divisor is zero
- Rejects results where `|CPI| > 1000` or `|SPI| > 1000` (data quality filter)

---

### Failure Handling

| Level | Behavior |
|-------|----------|
| **File-level** | `IngestionFile.status` set to `failed` with error message |
| **Header-level** | `ImportValidationException` thrown with unrecognized columns + suggestion to add alias |
| **Row-level** | Error logged as `"Baris {N}: {message}"`, row skipped, processing continues |
| **Partial success** | `IngestionFile.status` = `partial`, with `imported_rows` and `skipped_rows` counts |
| **Empty file** | `RuntimeException('File Excel kosong.')` |
| **Missing `project_code`** | `RuntimeException('project_code tidak ditemukan')` |

---

## 4. Database Design

### Tables Overview

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | Authentication & ownership | Has many projects, ingestion files |
| `projects` | Core project entity with KPI fields | Belongs to user; has many WBS phases, progress curves, risks |
| `project_wbs` | WBS phases (Level 3 in drill-down) | Belongs to project; has many work items, materials, equipment |
| `project_work_items` | Hierarchical cost breakdown (Level 4) | Belongs to WBS phase; self-referencing parent-child |
| `project_material_logs` | Vendor/material invoice records (Level 5) | Belongs to WBS phase and optionally to work item |
| `project_equipment_logs` | Equipment rental records | Belongs to WBS phase and optionally to work item |
| `project_progress_curves` | S-curve data points | Belongs to project |
| `project_risks` | Risk register with scoring | Belongs to project |
| `ingestion_files` | Upload tracking & audit trail | Has many projects |
| `column_aliases` | User-defined header mappings | Belongs to creator user |
| `harsat_histories` | Unit rate historical data | Standalone |
| `project_vendors` | Extended vendor master (sheet 7 of EPC workbook) | Belongs to project; matched to work items by `po_number` |
| `project_indirect_cost_items` | Indirect cost line items (sheet 3) | Belongs to project |
| `project_other_cost_items` | Other cost line items (sheet 4) | Belongs to project |
| `project_profit_loss` | Level 3 P&L roll-up (`beban_pph_final`, `laba_kotor`, `lsp`) | 1:1 with project; rebuilt by `FinancialSummaryAggregator` |
| `project_sales` | Level 3 sales roll-up (`penjualan`) | 1:1 with project; aggregator-rebuilt |
| `project_direct_cost` | Level 3 direct cost roll-up (`material`, `upah`, `alat`, `subkon`) | 1:1 with project; aggregator-rebuilt |
| `project_indirect_cost` | Level 3 indirect cost roll-up (`fasilitas`, `sekretariat`, …) | 1:1 with project; aggregator-rebuilt |
| `project_other_cost` | Level 3 other cost roll-up (`biaya_pemeliharaan`, `risiko`) | 1:1 with project; aggregator-rebuilt |

### Detailed Column Reference

#### `projects`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK, auto-increment | |
| project_code | varchar(20) | Unique | e.g., `WIKA-TOL-SD2-2024` |
| project_name | varchar(255) | NOT NULL | |
| division | varchar(100) | Nullable, enum: Infrastructure/Building | |
| sbu | varchar(100) | Nullable | Strategic Business Unit |
| owner | varchar(100) | Nullable | Client/pemberi tugas |
| contract_value | decimal(15,2) | Nullable | In Juta (million IDR) |
| planned_cost | decimal(15,2) | Nullable | Budgeted cost |
| actual_cost | decimal(15,2) | Nullable | Realized cost |
| planned_duration | int | Nullable | In months |
| actual_duration | int | Nullable | In months |
| progress_pct | decimal(5,2) | Default 100 | Overall completion % |
| gross_profit_pct | decimal(8,4) | Nullable | |
| project_year | int | Default current year | |
| start_date | date | Nullable | |
| cpi | decimal(10,4) | Nullable | Auto-calculated |
| spi | decimal(10,4) | Nullable | Auto-calculated |
| status | varchar(20) | Nullable | good/warning/critical/unknown |
| ingestion_file_id | bigint | FK → ingestion_files, nullable | Source file |
| profit_center, type_of_contract, contract_type, payment_method, partnership, partner_name, consultant_name, funding_source, location | varchar | All nullable | Extended project fields |

**Indexes**: `project_code` (unique), `division`, `status`, `project_year`

> **Note:** The `user_id` column was dropped, uploads are shared across all users.

#### `project_wbs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| name_of_work_phase | varchar | NOT NULL | e.g., "Pekerjaan Persiapan & Mobilisasi" |
| client_name | varchar | Nullable | |
| project_manager | varchar | Nullable | |
| report_source | varchar | Nullable | e.g., `file_import` |
| ingestion_file_id | bigint | FK, nullable | |
| progress_prev_pct | decimal(6,2) | Nullable | Progress s/d bulan lalu |
| progress_this_pct | decimal(6,2) | Nullable | Progress bulan ini |
| progress_total_pct | decimal(6,2) | Nullable | Total progress |
| contract_value | decimal(20,2) | Nullable | Phase-level budget |
| addendum_value | decimal(20,2) | Nullable | |
| total_pagu | decimal(20,2) | Nullable | contract + addendum |
| hpp_plan_total | decimal(20,2) | Nullable | Sum of work item budgets |
| hpp_actual_total | decimal(20,2) | Nullable | Sum of work item actuals |
| hpp_deviation | decimal(20,2) | Nullable | plan - actual |
| deviasi_pct | decimal(8,4) | Nullable | |

#### `project_work_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| period_id | bigint | FK → project_wbs (cascade) | Links to WBS phase |
| parent_id | bigint | FK → self, nullable | Hierarchical structure |
| level | tinyint | 0-2 | 0=category, 1=sub-item, 2=detail |
| item_no | varchar(20) | Nullable | e.g., "I.1", "II.3.1" |
| item_name | varchar | NOT NULL | |
| sort_order | smallint | | Display order |
| budget_awal | decimal(20,2) | Nullable | Original budget |
| addendum | decimal(20,2) | Default 0 | Budget adjustment |
| total_budget | decimal(20,2) | Nullable | budget_awal + addendum |
| realisasi | decimal(20,2) | Nullable | Actual spend |
| deviasi | decimal(20,2) | Nullable | budget - actual |
| deviasi_pct | decimal(8,4) | Nullable | |
| is_total_row | boolean | Default false | Marks summary rows |
| cost_category | varchar | Nullable | Langsung / Tidak Langsung |
| vendor_name | varchar | Nullable | Assigned vendor |
| po_number | varchar | Nullable | Purchase order number |
| bobot_pct | decimal(8,4) | Nullable | Weight percentage |
| progress_plan_pct | decimal(8,4) | Nullable | Planned progress |
| progress_actual_pct | decimal(8,4) | Nullable | Actual progress |
| planned_value | decimal(20,2) | Nullable | PV (BCWS) — `volume × harsat × progress_plan` |
| earned_value | decimal(20,2) | Nullable | EV (BCWP) — `volume × harsat × progress_actual` |
| actual_cost_item | decimal(20,2) | Nullable | AC (ACWP) — `volume_actual × harsat_actual` |
| vendor_contract_value | decimal(20,2) | Nullable | Vendor PO value |
| termin_paid | decimal(20,2) | Nullable | Termin dibayar |
| retention | decimal(20,2) | Nullable | Retensi 5% — `vendor_contract_value × 0.05` |
| outstanding_debt | decimal(20,2) | Nullable | Sisa Hutang — `vendor_contract_value × 0.95 − termin_paid` |

**Indexes**: `[period_id, parent_id]`, `[period_id, level]`

#### `project_material_logs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| period_id | bigint | FK → project_wbs (cascade) | |
| work_item_id | bigint | FK → project_work_items, nullable | |
| supplier_name | varchar(200) | NOT NULL | |
| material_type | varchar(200) | NOT NULL | |
| qty | decimal(15,4) | Nullable | |
| satuan | varchar(30) | Nullable | Unit (m3, kg, ls, etc.) |
| harga_satuan | decimal(20,2) | Nullable | Unit price |
| total_tagihan | decimal(20,2) | Nullable | Total invoice |
| is_discount | boolean | Default false | Marks discount/potongan rows |
| source_row | smallint | Nullable | Excel row number for tracing |

#### `project_equipment_logs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| period_id | bigint | FK → project_wbs (cascade) | |
| work_item_id | bigint | FK, nullable | |
| vendor_name | varchar(200) | NOT NULL | |
| equipment_name | varchar(200) | NOT NULL | |
| jam_kerja | decimal(10,2) | Nullable | Working hours |
| rate_per_jam | decimal(20,2) | Nullable | Hourly rate |
| total_biaya | decimal(20,2) | Nullable | Total cost |
| payment_status | varchar(30) | Nullable | |

#### `project_progress_curves`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| week_number | smallint | Unique with project_id | |
| rencana_pct | decimal(6,2) | Nullable | Planned % |
| realisasi_pct | decimal(6,2) | Nullable | Actual % |
| deviasi_pct | decimal(7,2) | Nullable | actual - planned |
| keterangan | varchar(100) | Nullable | Label/note |

#### `project_risks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| risk_code | varchar(20) | Nullable | e.g., R-001 |
| risk_title | varchar(255) | NOT NULL | |
| risk_description | text | Nullable | |
| category | varchar(50) | Nullable | |
| financial_impact_idr | decimal(20,2) | Nullable | |
| probability | tinyint | 1-5 | |
| impact | tinyint | 1-5 | |
| severity | varchar(20) | Auto-calculated | critical/high/medium/low |
| mitigation | text | Nullable | |
| status | varchar(20) | Default 'open' | |
| owner | varchar(100) | Nullable | |

**Severity auto-calculation**: `score = probability × impact` → critical (≥20), high (≥12), medium (≥6), low (<6)

#### `project_vendors`

Extended vendor master populated from the **Vendor Detail** sheet (sheet 7). Joined to `project_work_items` via `(project_id, po_number)` so the Level 6 page can show vendor location/NPWP.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| ingestion_file_id | bigint | FK, nullable | Source file |
| vendor_name | varchar(255) | NOT NULL | |
| npwp | varchar(32) | Nullable | Tax ID |
| lokasi | varchar(100) | Nullable | Vendor location |
| po_number | varchar(64) | NOT NULL, unique with project_id | |
| po_date | date | Nullable | |
| contract_value | decimal(20,2) | Nullable | Vendor PO value |
| uang_muka | decimal(20,2) | Nullable | Down payment |
| termin_paid | decimal(20,2) | Nullable | |
| retensi | decimal(20,2) | Nullable | Raw retention from sheet (work-item-level retention is recomputed as 5%) |
| ppn_status | varchar(32) | Nullable | |
| currency | varchar(32) | Default 'IDR' | |

**Indexes**: `[project_id, po_number]` (unique), `vendor_name`

#### `project_indirect_cost_items`

Line items from the **Indirect Cost** sheet (sheet 3).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| ingestion_file_id | bigint | FK, nullable | |
| sub_kategori | varchar(100) | NOT NULL | e.g., Fasilitas, Personalia |
| item_detail | varchar(255) | Nullable | |
| budget | decimal(20,2) | Nullable | |
| realisasi | decimal(20,2) | Nullable | Aggregated into `projects.actual_cost` |
| deviasi | decimal(20,2) | Nullable | |
| catatan | text | Nullable | |

**Indexes**: `[project_id, sub_kategori]`

#### `project_other_cost_items`

Line items from the **Other Cost** sheet (sheet 4, Table A). Sheet's Table B (P&L footer) writes `tarif_pph_final` directly onto `projects`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| project_id | bigint | FK → projects (cascade) | |
| ingestion_file_id | bigint | FK, nullable | |
| kategori | varchar(100) | NOT NULL | Biaya Pemeliharaan, Risiko, etc. |
| item | varchar(255) | Nullable | |
| nilai | decimal(20,2) | Nullable | Aggregated into `projects.actual_cost` |
| catatan | text | Nullable | |

**Indexes**: `[project_id, kategori]`

#### Level 3 P&L Summary Tables

These five tables are 1:1 with `projects` and rebuilt by `FinancialSummaryAggregator::rebuild()` at the end of every `EpcStandardImport::import()`. They power the Level 3 financial dashboard without requiring runtime aggregation.

| Table | Columns | Source |
|-------|---------|--------|
| `project_profit_loss` | `beban_pph_final`, `laba_kotor`, `lsp` | Computed: `beban_pph_final = penjualan × tarif_pph_final`; `laba_kotor = penjualan − total_costs − beban_pph_final`; `lsp = laba_kotor / penjualan` |
| `project_sales` | `penjualan` | `projects.contract_value + addendum_value` |
| `project_direct_cost` | `material`, `upah`, `alat`, `subkon` | Sum of `project_work_items.realisasi` grouped by `cost_subcategory` |
| `project_indirect_cost` | `fasilitas`, `sekretariat`, `kendaraan`, `personalia`, `keuangan`, `umum` | Sum of `project_indirect_cost_items.realisasi` grouped by `sub_kategori` |
| `project_other_cost` | `biaya_pemeliharaan`, `risiko` | Sum of `project_other_cost_items.nilai` grouped by `kategori` |

#### `ingestion_files`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| original_name | varchar | NOT NULL | Original filename |
| stored_path | varchar | NOT NULL | Path in storage |
| disk | varchar | Default 'local' | |
| status | enum | pending/processing/success/failed/partial | Lifecycle state |
| total_rows | int | Nullable | |
| imported_rows | int | Nullable | |
| skipped_rows | int | Nullable | |
| errors | json | Nullable | Array of error messages |
| processed_at | timestamp | Nullable | |

#### `column_aliases`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | bigint | PK | |
| alias | varchar(120) | Unique with context | The non-standard header name |
| target_field | varchar(80) | NOT NULL | Canonical field name |
| context | varchar(30) | Nullable | project/work_item/material/equipment/s_curve |
| is_active | boolean | Default true | Soft-delete via deactivation |
| created_by | bigint | FK → users, nullable | |

---

## 5. ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    users {
        bigint id PK
        string name
        string email UK
        string password
        string role
        timestamp email_verified_at
    }

    projects {
        bigint id PK
        string project_code
        string project_name
        string division
        string sbu
        string owner
        decimal contract_value
        decimal planned_cost
        decimal actual_cost
        int planned_duration
        int actual_duration
        decimal progress_pct
        decimal cpi
        decimal spi
        string status
        int project_year
        bigint ingestion_file_id FK
    }

    project_wbs {
        bigint id PK
        bigint project_id FK
        string name_of_work_phase
        string client_name
        string project_manager
        decimal contract_value
        decimal hpp_plan_total
        decimal hpp_actual_total
        decimal hpp_deviation
        decimal progress_total_pct
        bigint ingestion_file_id FK
    }

    project_work_items {
        bigint id PK
        bigint project_wbs_id FK
        bigint parent_id FK
        tinyint level
        string item_no
        string item_name
        decimal total_budget
        decimal realisasi
        decimal deviasi
        string vendor_name
        string po_number
        decimal planned_value
        decimal earned_value
        decimal actual_cost_item
        decimal vendor_contract_value
        decimal termin_paid
        decimal retention
        decimal outstanding_debt
        boolean is_total_row
    }

    project_vendors {
        bigint id PK
        bigint project_id FK
        bigint ingestion_file_id FK
        string vendor_name
        string npwp
        string lokasi
        string po_number
        date po_date
        decimal contract_value
        decimal uang_muka
        decimal termin_paid
        decimal retensi
        string ppn_status
        string currency
    }

    project_indirect_cost_items {
        bigint id PK
        bigint project_id FK
        bigint ingestion_file_id FK
        string sub_kategori
        string item_detail
        decimal budget
        decimal realisasi
        decimal deviasi
    }

    project_other_cost_items {
        bigint id PK
        bigint project_id FK
        bigint ingestion_file_id FK
        string kategori
        string item
        decimal nilai
    }

    project_profit_loss {
        bigint id PK
        bigint project_id FK
        decimal beban_pph_final
        decimal laba_kotor
        decimal lsp
    }

    project_sales {
        bigint id PK
        bigint project_id FK
        decimal penjualan
    }

    project_direct_cost {
        bigint id PK
        bigint project_id FK
        decimal material
        decimal upah
        decimal alat
        decimal subkon
    }

    project_indirect_cost {
        bigint id PK
        bigint project_id FK
        decimal fasilitas
        decimal sekretariat
        decimal kendaraan
        decimal personalia
        decimal keuangan
        decimal umum
    }

    project_other_cost {
        bigint id PK
        bigint project_id FK
        decimal biaya_pemeliharaan
        decimal risiko
    }

    project_material_logs {
        bigint id PK
        bigint project_wbs_id FK
        bigint work_item_id FK
        string supplier_name
        string material_type
        decimal qty
        string satuan
        decimal harga_satuan
        decimal total_tagihan
        boolean is_discount
    }

    project_equipment_logs {
        bigint id PK
        bigint project_wbs_id FK
        bigint work_item_id FK
        string vendor_name
        string equipment_name
        decimal jam_kerja
        decimal rate_per_jam
        decimal total_biaya
        string payment_status
    }

    project_progress_curves {
        bigint id PK
        bigint project_id FK
        smallint week_number
        decimal rencana_pct
        decimal realisasi_pct
        decimal deviasi_pct
        string keterangan
    }

    project_risks {
        bigint id PK
        bigint project_id FK
        string risk_code
        string risk_title
        string category
        decimal financial_impact_idr
        tinyint probability
        tinyint impact
        string severity
        string status
    }

    ingestion_files {
        bigint id PK
        string original_name
        string stored_path
        string status
        int total_rows
        int imported_rows
        int skipped_rows
        json errors
    }

    personal_access_tokens {
        bigint id PK
        string tokenable_type
        bigint tokenable_id FK
        string name
        string token UK
        string ip_address
        string user_agent
        boolean remember
        timestamp expires_at
        timestamp last_used_at
    }

    column_aliases {
        bigint id PK
        string alias
        string target_field
        string context
        boolean is_active
        bigint created_by FK
    }

    harsat_histories {
        bigint id PK
        string category
        string category_key
        year year
        decimal value
        string unit
    }

    %% RELATIONSHIPS
    users ||--o{ personal_access_tokens : "has sessions"
    users ||--o{ column_aliases : "creates"
    
    projects ||--o{ project_wbs : "has phases"
    projects ||--o{ project_progress_curves : "has S-curve"
    projects ||--o{ project_risks : "has risks"
    projects ||--o{ project_vendors : "has vendors"
    projects ||--o{ project_indirect_cost_items : "indirect line items"
    projects ||--o{ project_other_cost_items : "other line items"
    projects ||--|| project_profit_loss : "P&L roll-up"
    projects ||--|| project_sales : "sales roll-up"
    projects ||--|| project_direct_cost : "direct cost roll-up"
    projects ||--|| project_indirect_cost : "indirect cost roll-up"
    projects ||--|| project_other_cost : "other cost roll-up"
    projects }o--|| ingestion_files : "sourced from"
    
    project_wbs ||--o{ project_work_items : "contains items"
    
    project_work_items ||--o{ project_work_items : "parent-child"
    project_work_items ||--o{ project_material_logs : "linked materials"
    project_work_items ||--o{ project_equipment_logs : "linked equipment"
    project_work_items }o..o| project_vendors : "matched by po_number"
```

---

## 6. Data Flow Diagrams

### Ingestion Pipeline Flow

```mermaid
flowchart TD
    A[User uploads Excel file] --> B[POST /api/projects/upload]
    B --> C[Store file to storage/app/ingestion-files/]
    C --> D[Create IngestionFile record - status: pending]
    D --> E{resolveImporter}

    E -->|"Project Metadata + WBS Data sheets"| EPC[EpcStandardImport - PRIMARY]
    E -->|"> 1 sheet"| F[PolaCImport - legacy]
    E -->|"1 sheet, supports?"| H[AdaptiveWorkbookImport]
    E -->|"HPP/vendor markers"| J[PolaBImport - legacy]
    E -->|"default"| K[ProjectImport - legacy]

    EPC --> EPC1[Sheet 1: Project Metadata - upsert Project]
    EPC --> EPC2[Sheet 2: WBS Data - wipe + recreate phases & work items, compute PV/EV/AC, retention 5%, sisa hutang]
    EPC --> EPC3[Sheet 3: Indirect Cost]
    EPC --> EPC4[Sheet 4: Other Cost + tarif_pph_final]
    EPC --> EPC5[Sheet 5: Progress Curve]
    EPC --> EPC6[Sheet 6: Risk Register]
    EPC --> EPC7[Sheet 7: Vendor Detail]

    EPC2 --> AGG[recomputeProjectAggregates]
    EPC3 --> AGG
    EPC4 --> AGG
    AGG --> FSA[FinancialSummaryAggregator.rebuild]
    FSA --> PL[Level 3 P&L tables: project_profit_loss, project_sales, project_direct_cost, project_indirect_cost, project_other_cost]

    F --> L[WorkbookFieldMapper - normalize headers + resolve aliases]
    H --> L
    J --> L
    K --> L

    L --> M[Validate required fields]
    M -->|Missing| N[ImportValidationException]
    M -->|OK| O[Parse & upsert data rows]

    O --> P[projects, project_wbs, project_work_items, project_material_logs, project_equipment_logs, project_progress_curves]

    EPC1 --> P2[projects]
    EPC2 --> WBSTBL[project_wbs + project_work_items]
    EPC3 --> ICI[project_indirect_cost_items]
    EPC4 --> OCI[project_other_cost_items]
    EPC5 --> PC[project_progress_curves]
    EPC6 --> RK[project_risks]
    EPC7 --> VND[project_vendors]

    P2 --> V[Boot Hook: KpiCalculatorService]
    P --> V
    V --> W[Auto-calculate CPI, SPI, status]
    W --> X[Update IngestionFile status]
    X --> Y[Return JSON response with counts + errors + warnings]
```

### Drill-Down Hierarchy

```mermaid
flowchart LR
    L1[Level 1 - Dashboard] -->|"GET /dashboard, /projects/summary"| L2[Level 2 - Project List]
    L2 -->|"GET /projects/:id"| L3[Level 3 - Project Detail + P&L]
    L3 -->|"GET /projects/:id/profit-loss"| PL[P&L roll-up tables]
    L3 -->|"GET /projects/:id/wbs-phases"| L4[Level 4 - WBS Phases]
    L4 -->|"GET /wbs-phases/:id/work-items"| L5[Level 5 - Work Items]
    L5 -->|"GET /work-items/:id"| L6[Level 6 - Data Monitoring Kontrak Vendor]

    L4 -->|"GET /wbs-phases/:id/hpp-summary"| L4H[HPP Cost Summary]
    L4 -->|"GET /wbs-phases/:id/materials"| L5M[Materials]
    L4 -->|"GET /wbs-phases/:id/equipment"| L5E[Equipment]

    L6 -.->|"join project_vendors by po_number"| VND[(Vendor master: lokasi, npwp)]
    L6 -.->|"PV/EV/AC, Retensi 5%, Sisa Hutang"| EVM[Computed at import time]
```

### Importer Class Diagram

```mermaid
flowchart TD
    EPC[EpcStandardImport - PRIMARY]
    DR[DivisionResolver]
    FSA[FinancialSummaryAggregator]
    WFM[WorkbookFieldMapper]

    PI[ProjectImport - Pola A, legacy]
    PBI[PolaBImport - Pola B, legacy]
    PCI[PolaCImport - Pola C, legacy]
    AWI[AdaptiveWorkbookImport]
    KPI[KpiCalculatorService]

    EPC --> DR
    EPC --> FSA
    PI --> WFM
    PBI --> WFM
    PCI --> WFM
    AWI --> WFM

    EPC -->|"upsert"| PRJ[(projects)]
    EPC -->|"wipe + create"| WBS[(project_wbs)]
    EPC -->|"wipe + create"| WI[(project_work_items)]
    EPC -->|"create"| ICI[(project_indirect_cost_items)]
    EPC -->|"create"| OCI[(project_other_cost_items)]
    EPC -->|"create"| SC[(project_progress_curves)]
    EPC -->|"create"| RK[(project_risks)]
    EPC -->|"create"| VND[(project_vendors)]

    FSA -->|"rebuild"| PL[(project_profit_loss)]
    FSA -->|"rebuild"| SAL[(project_sales)]
    FSA -->|"rebuild"| DC[(project_direct_cost)]
    FSA -->|"rebuild"| IC[(project_indirect_cost)]
    FSA -->|"rebuild"| OC[(project_other_cost)]

    PI -->|"upsert"| PRJ
    PBI -->|"upsert"| PRJ
    PBI -->|"create"| WBS
    PBI -->|"create"| WI
    PBI -->|"create"| ML[(project_material_logs)]
    PCI -->|"upsert"| PRJ
    PCI -->|"create"| WBS
    PCI -->|"create"| WI
    PCI -->|"create"| ML
    PCI -->|"create"| EL[(project_equipment_logs)]
    PCI -->|"create"| SC
    AWI -->|"upsert"| PRJ
    AWI -->|"create"| WBS
    AWI -->|"create"| WI
    AWI -->|"create"| ML
    AWI -->|"create"| EL
    AWI -->|"create"| SC
    AWI -->|"create"| RK

    WI -.->|"po_number join"| VND
    PRJ -.->|"boot hook"| KPI
```

---

## 7. API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login. Body: `email`, `password`, `remember?` (30d vs 12h TTL), `device_name?`. Returns `{ token, expires_at, remember, user }` | No |
| POST | `/api/auth/logout` | Revoke current token | Yes |
| GET | `/api/auth/me` | Current user info | Yes |
| GET | `/api/auth/sessions` | List user's active devices with `ip_address`, `user_agent`, `expires_at`, `is_current` | Yes |
| DELETE | `/api/auth/sessions/{id}` | Revoke one specific session | Yes |

> **Session cap:** max 3 concurrent tokens per user — the 4th login prunes the oldest by `last_used_at`.

### Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard` | Combined dashboard payload (all-in-one) | No |

### Projects

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/projects` | List projects (filterable: division, sbu, status, year, contract range, sorting) | No |
| GET | `/api/projects/summary` | Dashboard KPIs: avg CPI/SPI, status counts, division breakdown | No |
| GET | `/api/projects/sbu-distribution` | SBU chart data | No |
| GET | `/api/projects/filter-options` | Available filter values | No |
| GET | `/api/projects/building/cpi` | Building-division project list ranked by CPI | No |
| GET | `/api/projects/building/spi` | Building-division project list ranked by SPI | No |
| GET | `/api/projects/infrastructure/cpi` | Infrastructure-division project list ranked by CPI | No |
| GET | `/api/projects/infrastructure/spi` | Infrastructure-division project list ranked by SPI | No |
| GET | `/api/projects/export-dashboard` | **Composite** dashboard payload for PDF export: `{ generated_at, filters, summary, sbu_distribution, filter_options, division_kpis, projects }` — single call consolidating everything the Home dashboard renders | Yes |
| GET | `/api/projects/{id}` | Project detail | No |
| GET | `/api/projects/{id}/insight` | AI-style analysis bullets | No |
| GET | `/api/projects/{id}/profit-loss` | Level 3 P&L roll-up (sales, direct/indirect/other cost, profit-loss summary tables rebuilt by `FinancialSummaryAggregator`) | Yes |
| POST | `/api/projects` | Create project manually | Yes |
| PUT | `/api/projects/{id}` | Update project | Yes |
| PATCH | `/api/projects/{id}` | Partial update | Yes |
| DELETE | `/api/projects/{id}` | Delete project | Yes |

### File Upload & Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/upload` | Upload Excel file(s), auto-import |
| POST | `/api/ingestion-files/{id}/reprocess` | Re-import previously uploaded file |
| GET | `/api/ingestion-files` | List upload history (paginated) |
| GET | `/api/ingestion-files/{id}/download` | Download original file |

### WBS Phases (Level 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/wbs-phases` | List all WBS phases for project |
| GET | `/api/projects/{id}/wbs-phases/{wbsId}` | Phase detail with work items |

### Work Items (Level 4–6)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wbs-phases/{wbsId}/work-items` | List work items in phase (Level 4) |
| GET | `/api/wbs-phases/{wbsId}/hpp-summary` | Cost breakdown by category (Level 4 HPP roll-up) |
| GET | `/api/work-items/{id}` | Work item detail — includes EVM (PV/EV/AC), vendor contract block (`vendor_contract_value`, `termin_paid`, `retention`, `outstanding_debt`), and joined vendor master fields (`vendor_lokasi`, `vendor_npwp`) used by the Level 6 Data Monitoring Kontrak Vendor page |

### Materials & Equipment (Level 5)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wbs-phases/{wbsId}/materials` | Material logs for phase |
| GET | `/api/wbs-phases/{wbsId}/equipment` | Equipment logs for phase |
| GET | `/api/work-items/{id}/materials` | Materials for specific work item |
| GET | `/api/work-items/{id}/equipment` | Equipment for specific work item |

### Cross-Project Resource Database

Aggregates work-item & vendor data across **all** projects for the Material/Resource Database screens.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials` | Cross-project material list (filterable) |
| GET | `/api/materials/filter-options` | Available material filter values |
| GET | `/api/resources` | Cross-project resource (vendor/material/equipment) list |
| GET | `/api/resources/filter-options` | Available resource filter values |

### Progress & S-Curve

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/progress-curve` | Weekly S-curve aggregated to monthly |

### Risks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/risks` | List risks with totals |
| POST | `/api/projects/{id}/risks` | Create risk |
| PUT | `/api/projects/{id}/risks/{riskId}` | Update risk |
| PATCH | `/api/projects/{id}/risks/{riskId}` | Partial update |
| DELETE | `/api/projects/{id}/risks/{riskId}` | Delete risk |

### Column Aliases

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/column-aliases` | List aliases (filterable by context) | No |
| GET | `/api/column-aliases/{id}` | Show single alias | No |
| POST | `/api/column-aliases` | Create alias | Yes |
| PUT | `/api/column-aliases/{id}` | Update alias | Yes |
| PATCH | `/api/column-aliases/{id}` | Partial update | Yes |
| DELETE | `/api/column-aliases/{id}` | Deactivate alias | Yes |

### Unit Rates (Harsat)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/harsat/trend` | Unit rate trends by category/year |
| POST | `/api/harsat` | Upsert harsat data point |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List available roles |
| GET | `/api/users/{id}/role` | Get user's role |
| PATCH | `/api/users/{id}/role` | Assign role |

> Auth: rows marked **Auth: No** in the tables above are public for the PoC (dashboard reads, project list/detail, column-alias GETs, `/harsat/trend`). All other endpoints require `Authorization: Bearer {token}`.

---

## 8. Setup & Operations

### Local Development

#### Backend (apps/api)

```bash
cd apps/api
composer install                    # Install PHP dependencies
cp .env.example .env               # Create env file
php artisan key:generate            # Generate app key
php artisan migrate --seed          # Run migrations + seed data
php artisan serve                   # Start dev server on :8000
```

#### Frontend (apps/web)

```bash
cd apps/web
npm install                         # Install JS dependencies
cp .env.example .env                # Create env file
npm run dev                         # Start Next.js dev server on :3000
```

### Environment Variables

#### Backend (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_CONNECTION` | `sqlite` | Database driver (sqlite/pgsql) |
| `DB_DATABASE` | `database/database.sqlite` | SQLite path |

#### Frontend (`apps/web/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` | Laravel backend URL |

### Docker Deployment (Backend)

The backend uses a multi-stage Dockerfile:
1. **Stage 1**: Composer installs dependencies
2. **Stage 2**: PHP 8.3-FPM Alpine + Nginx + Supervisor

**Entrypoint** (`docker/entrypoint.sh`) runs on every container start:
1. Create SQLite database if missing
2. `php artisan key:generate`
3. `php artisan migrate --force`
4. `php artisan db:seed --force`
5. Cache config, routes, views
6. Start Supervisor (PHP-FPM + Nginx)

**Build & Deploy via GitHub Actions**:
```mermaid
flowchart LR
    Push["`git push`"] --> GHA["`GitHub Actions`"]
    GHA --> Build["`docker build`"]
    Build --> PushImg["`docker push`"]
    PushImg --> SSH["`SSH to VPS`"]
    SSH --> Pull["`docker pull`"]
    Pull --> Restart["`restart container`"]
```

### Vercel Deployment (Frontend)

The frontend is deployed on Vercel with `NEXT_PUBLIC_API_BASE_URL` set for Production.

```bash
cd apps/web
vercel --prod                       # Deploy to production
```

---

## 9. Assumptions & Known Gaps

| Item | Notes |
|------|-------|
| **SQLite in Docker** | No persistent volume, so each container rebuild = fresh DB. Need add volume for data persistence. |
| **No test suite** | No PHPUnit tests or frontend tests configured. |
| **No queue/async** | Import runs synchronously in the request. Large files may timeout. |
| **No rate limiting** | Upload endpoint has no rate limit. |
| **Currency in Juta** | All monetary values stored in Juta (million IDR). Frontend formats as M/T. |
| **Single-tenant auth** | Sanctum tokens, no OAuth/SSO. Role field exists but no middleware enforcement beyond admin/user. |
| **Earned Value simplification** | CPI uses `(progress% × plannedCost) / actualCost` rather than full ANSI/EIA-748 EVM. |
| **No file virus scanning** | Uploaded Excel files are not scanned for malware. |
| **Frontend is client-rendered** | No SSR data fetching, so all pages use `useEffect` + `useState`. |

# CPIP Database Mapping Documentation

## Table of Contents
1. [Filter Mapping](#filter-mapping)
2. [7-Level Flow Mapping](#7-level-flow-mapping)
3. [Table Relationships](#table-relationships)

---

## Filter Mapping

### Project Filters (14 Filters)

| # | Filter Name | DB Table | DB Column | Type | Values/Example |
|---|-------------|----------|-----------|------|----------------|
| 1 | Nama Proyek | `projects` | `project_name` | varchar(255) | Free text search |
| 2 | Profit Center | `projects` | `profit_center` | varchar(255) | Building Construction Division, Infrastructure Division |
| 3 | Owner | `projects` | `owner` | varchar(100) | Pemerintah, Swasta, BUMN, Danantara |
| 4 | Sumber Dana | `projects` | `funding_source` | varchar(100) | APBN, APBD, Swasta, Loan |
| 5 | Jenis Kontrak | `projects` | `type_of_contract` | varchar(100) | Konvensional, Design and Build, EPCC |
| 6 | Tipe Kontrak | `projects` | `contract_type` | varchar(100) | Unit Price, Lumpsum, Gabungan |
| 7 | SBU Proyek | `projects` | `sbu` | varchar(100) | Gedung RS, Jembatan, Bandara, etc. |
| 8 | Cara Pembayaran | `projects` | `payment_method` | varchar(100) | Monthly Progress, Milestone, CPF (Turnkey) |
| 9 | Durasi Pelaksanaan | `projects` | `planned_duration` | integer | In months |
| 10 | Nama MK/Konsultan | `projects` | `consultant_name` | varchar(255) | Free text |
| 11 | Lokasi Proyek | `projects` | `location` | varchar(255) | Surabaya, Jawa Timur |
| 12 | Kemitraan Proyek | `projects` | `partnership` | varchar(50) | JO, Non JO |
| 13 | Nama Mitra | `projects` | `partner_name` | varchar(255) | Filled only if partnership = JO |
| 14 | Division | `projects` | `division` | varchar(100) | Infrastructure, Building |

//ignore line 14 ya mas

---

## 7-Level Flow Mapping

### Level 1: Project Filters (Dashboard)

**Frontend Route:** `/projects`

**API Endpoint:** `GET /api/projects`

**Primary Table:** `projects`

**Columns Used:**
```php
// For filter options
- sbu              // Gedung RS, Jembatan, etc.
- owner            // Pemerintah, Swasta, BUMN, Danantara
- contract_type    // Unit Price, Lumpsum, Gabungan (Tipe Kontrak)
- type_of_contract // Konvensional, Design & Build, EPCC (Jenis Kontrak)
- payment_method   // Monthly Progress, Milestone, CPF
- partnership      // JO, Non JO
- partner_name     // Google, or anything
- funding_source   // APBN, APBD, Swasta, Loan
- location         // Project location
- project_year     // Year filter
- division         // Infrastructure, Building

// For display in results
- id               // Project ID for navigation
- project_code     // Unique code
- project_name     // Project name
- owner            // Client/owner
- sbu              // Strategic Business Unit
- gross_profit_pct // Profitability percentage
- cpi              // Cost Performance Index (calculated)
- spi              // Schedule Performance Index (calculated)
- status           // good, warning, critical (calculated)
```

---

### Level 2: Project List (Filtered Results)

**Frontend Route:** `/projects` (same page, after search)

**API Endpoint:** `GET /api/projects` with filter parameters

**Primary Table:** `projects`

**Columns Used:**
```php
// Same as Level 1, but with filtered results
- All columns from Level 1

// Additional display columns
- contract_value   // Contract value in Million
- actual_cost      // Actual cost incurred
- planned_duration // Planned duration in months
- actual_duration  // Actual duration in months
```

---

### Level 3: WBS Overview

**Frontend Route:** `/projects/[id]`

**API Endpoints:**
- `GET /api/projects/{id}`
- `GET /api/projects/{id}/periods`

**Primary Tables:** `projects`, `project_periods`

**Columns Used - projects:**
```php
- id               // For navigation
- project_code     // Display
- project_name     // Display
- division         // Display
- sbu              // Display
- owner            // Display
- location         // Display
- contract_value   // Display
- cpi              // KPI display
- spi              // KPI display
- status           // Status badge
```

**Columns Used - project_periods:**
```php
- id               // Period ID for navigation (tahapId)
- project_id       // FK to projects
- period           // YYYY-MM format
- client_name      // Client name for the period
- project_manager  // PM name
- progress_total_pct // Cumulative progress
- contract_value   // Contract value at period
- total_pagu       // Total pagu (contract + addendum)
- hpp_plan_total   // Planned HPP
- hpp_actual_total // Actual HPP
- hpp_deviation    // HPP deviation
```

**Display Data:**
- BQ External vs RAB Internal comparison
- Deviasi (%) calculation
- Action button to navigate to Level 4

---

### Level 4: Harsat Per Sumber Daya

**Frontend Route:** `/projects/[id]/[tahapId]`

**API Endpoint:** `GET /api/periods/{tahapId}/work-items`

**Primary Tables:** `project_periods`, `project_work_items`

**Columns Used - project_periods:**
```php
- id               // tahapId
- project_id       // For navigation
- period           // Display period
- progress_total_pct // Progress display
```

**Columns Used - project_work_items:**
```php
- id               // Item ID for navigation (itemId)
- period_id        // FK to project_periods
- parent_id        // Self-reference for hierarchy
- level            // 0=category, 1=sub-item, 2=detail
- item_no          // Item number (I., 1.1, 2.2, etc.)
- item_name        // "NAMA TAHAP PEKERJAAN" or "Nama Item"
- sort_order       // Display order
- budget_awal      // Initial budget
- addendum         // Addendum value
- total_budget     // Total budget (awal + addendum)
- realisasi        // ITD realization
- deviasi          // Budget deviation
- deviasi_pct      // Deviation percentage
- is_total_row     // Flag for summary rows
```

**Display Data:**
- Hierarchical work breakdown structure
- Total Biaya vs Realisasi comparison
- Deviasi (%) per item
- Action button to navigate to Level 5

---

### Level 5: Data Monitoring Kontrak Vendor

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]`

**API Endpoint:** `GET /api/periods/{tahapId}/materials`

**Primary Tables:** `project_periods`, `project_work_items`, `project_material_logs`

**Columns Used - project_periods:**
```php
- id               // tahapId
- project_id       // For navigation
- period           // Period display
```

**Columns Used - project_work_items:**
```php
- id               // itemId
- item_name        // Item name display
- total_budget     // Budget display
- realisasi        // Realization display
```

**Columns Used - project_material_logs:**
```php
- id               // Log ID
- period_id        // FK to project_periods
- work_item_id     // FK to project_work_items (optional)
- supplier_name    // "Nama Vendor"
- tahun_perolehan  // Year of acquisition
- lokasi_vendor    // Vendor location
- rating_performa  // Performance rating (e.g., "5/5")
- material_type    // Material description
- qty              // Quantity
- satuan           // Unit (m3, kg, ton, etc.)
- harga_satuan     // Unit price (IDR)
- total_tagihan    // Total billing amount
- realisasi_pengiriman // Delivery realization (e.g., "100% (Selesai)")
- deviasi_harga_market // Market price deviation (e.g., "+2%")
- catatan_monitoring  // Monitoring notes
- is_discount      // Flag for discount rows
```

**Display Data:**
- Vendor Information (Nama, Tahun, Lokasi, Rating)
- Contract Details (Nilai Kontrak, Harga Satuan, Realisasi)
- Deviasi Harga Market
- Action buttons: "Cek HPP Level" (to Level 6), "Cek Risk & Timeline" (to Level 7A/7B)

---

### Level 6: Analisa HPP & CPI

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]/hpp`

**API Endpoint:** `GET /api/projects/{id}/insight`

**Primary Tables:** `projects`, `project_periods`, `project_work_items`

**Columns Used - projects:**
```php
- id               // Project ID
- project_code     // Display
- project_name     // Display
- planned_cost     // For HPP calculation
- actual_cost      // For HPP calculation
- contract_value   // For profit calculation
- cpi              // CPI indicator
- status           // Status display
```

**Columns Used - project_periods:**
```php
- hpp_plan_total   // Planned HPP aggregate
- hpp_actual_total // Actual HPP aggregate
- hpp_deviation    // HPP deviation
```

**Columns Used - project_work_items:**
```php
- total_budget     // Per-item budget
- realisasi        // Per-item realization
- deviasi          // Per-item deviation
```

**Display Data:**
- HPP breakdown (Biaya Langsung vs Biaya Tidak Langsung)
- Plan vs Actual comparisons
- CPI indicator with visual status
- Summary insights
- Action button: "Cek Risk & Timeline" (to Level 7A/7B)

---

### Level 7A: Kamus Risiko

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]/risk`

**API Endpoint:** `GET /api/projects/{id}/risks`

**Primary Table:** `project_risks`

**Columns Used:**
```php
- id                      // Risk ID
- project_id              // FK to projects
- risk_code               // Risk code (e.g., RSK-001)
- risk_title              // Risk title
- risk_description        // Full description
- category                // cost, schedule, quality, safety, scope, external
- financial_impact_idr    // Estimated impact in IDR
- probability             // 1-5 scale
- impact                  // 1-5 scale
- severity                // low, medium, high, critical (auto-calculated)
- mitigation              // Mitigation plan
- status                  // open, mitigated, closed, monitoring
- owner                   // PIC name
- identified_at           // Identification date
- target_resolved_at      // Target resolution date
```

**Display Data:**
- Risk register with categories
- Severity levels (Critical, High, Medium, Low)
- Status tracking
- SPI indicator

---

### Level 7B: Project Timeline

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]/risk` (same as 7A)

**API Endpoint:** `GET /api/projects/{id}/progress-curve`

**Primary Table:** `project_progress_curves`

**Columns Used:**
```php
- id               // Curve ID
- project_id       // FK to projects
- week_number      // Week number (e.g., 12, 24)
- week_date        // Start date of week
- rencana_pct      // Planned cumulative percentage
- realisasi_pct    // Actual cumulative percentage
- deviasi_pct      // Deviation (realisasi - rencana)
- keterangan       // Condition notes (e.g., "Critical", "Material Delay")
```

**Display Data:**
- Planned vs Actual timeline data
- S-curve visualization
- Delay months and notes
- SPI status and interpretation

---

## Table Relationships

```
projects (1) ──── (N) project_periods ──── (N) project_work_items
    │                    │                      
    │ (1)                │ (1)                  
    │                    │                      
    └──(N) project_progress_curves      (N) project_material_logs
                          │                      
                          │ (1)                  
                          │                      
                          └──(N) project_equipment_logs

projects (1) ──── (N) project_risks
ingestion_files (1) ──── (N) projects
ingestion_files (1) ──── (N) project_periods
```

---

## ERD (Entity Relationship Diagram)

### Complete Database Schema with Levels

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE TABLES BY LEVEL                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │  LEVEL 1-2: projects                                                        │    │
│  │  ──────────────────────────────────────────────────────────────────────── │    │
│  │  PK: id                                                                   │    │
│  │  Columns: project_code, project_name, division, sbu, owner,             │    │
│  │           profit_center, type_of_contract, contract_type,               │    │
│  │           payment_method, partnership, partner_name,                     │    │
│  │           consultant_name, funding_source, location,                     │    │
│  │           contract_value, planned_cost, actual_cost,                     │    │
│  │           planned_duration, actual_duration, progress_pct,               │    │
│  │           gross_profit_pct, project_year, start_date,                     │    │
│  │           cpi (calc), spi (calc), status (calc)                          │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                         │    │
│                                      │ 1                                     │    │
│                                      ▼                                       │    │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │  LEVEL 3: project_periods                                                   │    │
│  │  ──────────────────────────────────────────────────────────────────────── │    │
│  │  PK: id                                                                   │    │
│  │  FK: project_id → projects.id                                            │    │
│  │  FK: ingestion_file_id → ingestion_files.id (nullable)                    │    │
│  │  Columns: period, client_name, project_manager, report_source,           │    │
│  │           progress_prev_pct, progress_this_pct, progress_total_pct,       │    │
│  │           contract_value, addendum_value, total_pagu (BQ External),       │    │
│  │           hpp_plan_total (RAB Internal), hpp_actual_total,                │    │
│  │           hpp_deviation, deviasi_pct (calc)                               │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                         │    │
│                                      │ N                                     │    │
│                                      ▼                                       │    │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │  LEVEL 3-4: project_work_items (self-referencing)                         │    │
│  │  ──────────────────────────────────────────────────────────────────────── │    │
│  │  PK: id                                                                   │    │
│  │  FK: period_id → project_periods.id                                      │    │
│  │  FK: parent_id → project_work_items.id (nullable, self-ref)              │    │
│  │  Columns: level (0=category, 1=sub-item, 2=detail),                        │    │
│  │           item_no, item_name, volume, satuan, harsat_internal,              │    │
│  │           sort_order, budget_awal, addendum, total_budget,                 │    │
│  │           realisasi, deviasi, deviasi_pct, is_total_row                    │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                         │    │
│              ┌───────────────────────┼───────────────────────┐                    │
│              │ N                     │ N                     │                    │
│              ▼                       ▼                       ▼                    │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐  │
│  │ project_material_logs │ │ project_equipment_logs│ │ project_progress_     │  │
│  │ LEVEL 5               │ │ LEVEL 5               │ │ curves (LEVEL 7B)     │  │
│  │ ─────────────────────│ │ ─────────────────────│ │ ────────────────────│  │
│  │ PK: id               │ │ PK: id               │ │ PK: id                │  │
│  │ FK: period_id        │ │ FK: period_id        │ │ FK: project_id        │  │
│  │ FK: work_item_id (opt)│ │ FK: work_item_id (opt)│ │       → projects.id  │  │
│  │ Columns: supplier_name│ │ Columns: vendor_name │ │ Columns: week_number,  │  │
│  │           tahun_perolehan,│ │           equipment_  │ │           week_date,     │  │
│  │           lokasi_vendor,│ │           name,       │ │           rencana_pct,   │  │
│  │           rating_performa,│ │           jam_kerja,  │ │           realisasi_pct, │  │
│  │           material_type,│ │           rate_per_jam,│ │           deviasi_pct,  │  │
│  │           qty, satuan,   │ │           total_biaya,│ │           keterangan     │  │
│  │           harga_satuan,  │ │           payment_    │                       │  │
│  │           total_tagihan, │ │           status     │                       │  │
│  │           realisasi_    │ │           source_row  │                       │  │
│  │           pengiriman,   │ │                      │                       │  │
│  │           deviasi_harga_│ │                      │                       │  │
│  │           market,       │ │                      │                       │  │
│  │           catatan_      │ │                      │                       │  │
│  │           monitoring,   │ │                      │                       │  │
│  │           is_discount    │ │                      │                       │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────┘  │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐│
│  │  LEVEL 7A: project_risks                                                   ││
│  │  ──────────────────────────────────────────────────────────────────────── ││
│  │  PK: id                                                                   ││
│  │  FK: project_id → projects.id                                            ││
│  │  Columns: risk_code, risk_title, risk_description, category,              ││
│  │           financial_impact_idr, probability, impact,                      ││
│  │           severity (calc), mitigation, status, owner,                      ││
│  │           identified_at, target_resolved_at                               ││
│  └───────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐│
│  │  SUPPORT TABLES                                                           ││
│  │  ──────────────────────────────────────────────────────────────────────── ││
│  │                                                                           ││
│  │  ingestion_files (Excel upload tracking)                                  ││
│  │  PK: id                                                                   ││
│  │  Columns: original_name, stored_path, disk, status, total_rows,           ││
│  │           imported_rows, skipped_rows, errors, processed_at              ││
│  │                                                                           ││
│  │  column_aliases (Dynamic column mapping)                                  ││
│  │  PK: id                                                                   ││
│  │  FK: created_by → users.id (nullable)                                    ││
│  │  Unique: (alias, context)                                                 ││
│  │  Columns: alias, target_field, context, is_active                        ││
│  │                                                                           ││
│  │  harsat_histories (Historical unit prices)                                ││
│  │  PK: id                                                                   ││
│  │  Unique: (category_key, year)                                             ││
│  │  Columns: category, category_key, year, value, unit                       ││
│  └───────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Table-to-Level Mapping

| Table | Level(s) | Description |
|-------|-----------|-------------|
| `projects` | Level 1, 2 | Main project data, filters, KPIs |
| `project_periods` | Level 3 | Monthly/period reports (BQ vs RAB) |
| `project_work_items` | Level 3, 4 | Work breakdown structure, HPP items |
| `project_material_logs` | Level 5 | Material/vendor tracking |
| `project_equipment_logs` | Level 5 | Equipment/vendor tracking |
| `project_progress_curves` | Level 7B | Weekly S-curve timeline data |
| `project_risks` | Level 7A | Risk register |

### Foreign Key Relationships

| From Table | From Column | To Table | To Column | Relationship |
|------------|------------|----------|-----------|--------------|
| `project_periods` | `project_id` | `projects` | `id` | Many-to-One |
| `project_periods` | `ingestion_file_id` | `ingestion_files` | `id` | Many-to-One |
| `project_work_items` | `period_id` | `project_periods` | `id` | Many-to-One |
| `project_work_items` | `parent_id` | `project_work_items` | `id` | Self-referencing |
| `project_material_logs` | `period_id` | `project_periods` | `id` | Many-to-One |
| `project_material_logs` | `work_item_id` | `project_work_items` | `id` | Many-to-One (opt) |
| `project_equipment_logs` | `period_id` | `project_periods` | `id` | Many-to-One |
| `project_equipment_logs` | `work_item_id` | `project_work_items` | `id` | Many-to-One (opt) |
| `project_progress_curves` | `project_id` | `projects` | `id` | Many-to-One |
| `project_risks` | `project_id` | `projects` | `id` | Many-to-One |
| `projects` | `ingestion_file_id` | `ingestion_files` | `id` | Many-to-One (opt) |
| `column_aliases` | `created_by` | `users` | `id` | Many-to-One (opt) |

### Unique Constraints

| Table | Columns | Description |
|-------|---------|-------------|
| `projects` | `project_code` | Unique project code |
| `project_periods` | `project_id + period` | One period per project per month |
| `project_progress_curves` | `project_id + week_number` | One curve per project per week |
| `column_aliases` | `alias + context` | One alias per context |

---

### Core Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `projects` | Main project data | `id` |
| `project_periods` | Monthly/period reports | `id` |
| `project_work_items` | WBS/HPP breakdown | `id` |
| `project_material_logs` | Material tracking | `id` |
| `project_equipment_logs` | Equipment tracking | `id` |
| `project_progress_curves` | Weekly S-curve data | `id` |
| `project_risks` | Risk register | `id` |
| `ingestion_files` | Excel upload tracking | `id` |
| `column_aliases` | Dynamic column mapping | `id` |
| `harsat_histories` | Historical unit prices | `id` |

---

## Auto-Calculated Fields

### projects table
- `cpi` = `planned_cost` / `actual_cost`
- `spi` = `planned_duration` / `actual_duration`
- `status` = 
  - "critical" if cpi < 0.9 OR spi < 0.9
  - "warning" if one < 1
  - "good" if both >= 1
- `project_year` = current year if null

### project_risks table
- `severity` = based on `probability` × `impact`:
  - "critical" if score >= 20
  - "high" if score >= 12
  - "medium" if score >= 6
  - "low" if score < 6

---

## API Endpoints Reference

### Project Endpoints
```
GET    /api/projects              - List projects with filters
GET    /api/projects/{id}         - Project details
GET    /api/projects/{id}/insight - Project insights
GET    /api/projects/{id}/periods - Project phases
GET    /api/projects/{id}/progress-curve - Timeline data
GET    /api/projects/{id}/risks   - Risk register
GET    /api/projects/summary      - Dashboard summary
GET    /api/projects/filter-options - Filter dropdown options
```

### Period Endpoints
```
GET    /api/periods/{periodId}/work-items - Work items for period
GET    /api/periods/{periodId}/materials  - Materials for period
GET    /api/periods/{periodId}/equipment  - Equipment for period
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-04-08 | 1.0 | Initial documentation with 7-level flow mapping |
| 2024-04-08 | 1.1 | Updated filter mapping (14 filters) with new columns |
| 2024-04-08 | 1.2 | Added `deviasi_pct` to project_periods (Level 3) |
| 2024-04-08 | 1.3 | Added `volume`, `satuan`, `harsat_internal` to project_work_items (Level 4) |
| 2024-04-08 | 1.4 | Added ERD (Entity Relationship Diagram) section |

---

*Last Updated: 2026-04-08*

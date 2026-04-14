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
- project_name     // For Project Name
- profit_center    // For Profit Center Code / Internal SPK Code
- owner            // For Project Owner (Name & Category)
- funding_source   // For Funding Source
- type_of_contract // For Contract Method
- contract_type    // For Contract Pricing Type
- sbu              // For SBU Project
- payment_method   // For Payment Method
- planned_duration // For Project Duration
- consultant_name  // For Project Consultant
- location         // For Location
- partnership      // For Partnership type (JO, Non JO)
- partner_name     // For Partnership name

- division         // soon
```

---

### Level 2: Project List (Filtered Results)

**Frontend Route:** `/projects` (same page, after search)

**API Endpoint:** `GET /api/projects` with filter parameters

**Primary Table:** `projects`

**Columns Used:**
```php
- project_name     // For Project Name
- contrat_value    // For Unit Rate (m²/km)
- gross_profit_pct // For Gross Profit
- spi              // For SPI
- cpi              // For CPI
```

---

### Level 3: WBS Overview

**Frontend Route:** `/projects/[id]`

**API Endpoints:**
- `GET /api/projects/{id}`
- `GET /api/projects/{id}/wbs-phases`

**Primary Tables:** `projects`, `project_wbs`

**project_wbs is a child table from projects table!**

**Columns Used - projects:**
```php
- id               // For navigation
```

**Columns Used - project_wbs:**
```php
- id                    // WBS Phase ID for navigation (wbsModel / tahapId)
- project_id            // FK to projects
- name_of_work_phase    // as Nama Tahap Pekerjaan [WBS Phase name (e.g., "PEKERJAAN PONDASI", "PEKERJAAN STRUKTUR")]
- total_pagu            // as BQ External
- hpp_plan_total        // as RAB Internal
- deviasi_pct           // as Deviasi %
```

---

### Level 4: Harsat Per Sumber Daya

**Frontend Route:** `/projects/[id]/[tahapId]`

**API Endpoint:** `GET /api/wbs-phases/{tahapId}/work-items`

**Primary Tables:** `project_wbs`, `project_work_items`

**project_work_items is a child table from project_wbs table!**

**Columns Used - project_wbs:**
```php
- id               // tahapId
- project_id       // For navigation
```

**Columns Used - project_work_items:**
```php
- id               // Item ID for navigation (itemId)
- period_id        // FK to project_wbs
- item_name        // Display Item sumber daya
- volume           // Display volume
- satuan           // Display satuan
- harsat_internal  // Display harsat internal
- total_budget     // Display total biaya
```

---

### Level 5: Data Monitoring Kontrak Vendor

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]`

**API Endpoint:** `GET /api/work-items/{workItem}/materials`

> **⚠️ IMPORTANT:** This endpoint returns ONLY materials where `work_item_id` = {workItem}.
> Use `GET /api/wbs-phases/{tahapId}/materials` to get ALL materials for the WBS phase (not filtered).

**Primary Tables:** `project_wbs`, `project_work_items`, `project_material_logs`

**project_material_logs is a child table from project_work_items!**

**Columns Used - project_wbs:**
```php
- id               // tahapId
- project_id       // For navigation
- name_of_work_phase  // WBS Phase display
```

**Columns Used - project_work_items:**
```php
- id               // itemId (used as workItem parameter)
- item_name        // Item name display
- total_budget     // Budget display (if needed)
```

**Columns Used - project_material_logs:**
```php
- id               // Log ID
- period_id        // FK to project_wbs
- work_item_id     // FK to project_work_items (FILTERED by this)
- supplier_name    // For Nama Vendor
- tahun_perolehan  // For Tahun Perolehan
- lokasi_vendor    // For Lokasi Vendor
- rating_performa  // For Rating Performa
- harga_satuan     // For Harga Satuan Vendor
- realisasi_pengiriman // For Realisasi Pengiriman
- deviasi_harga_market // For Deviasi Harga Market
- catatan_monitoring  // For Catatan Monitoring
- material_type    // For Material description (if needed)
- qty              // For Quantity (if needed)
- satuan           // For Unit (if needed)
- total_tagihan    // For Total billing amount (if needed)
- is_discount      // For Flag for discount rows (excluded from response) (if needed)
```


---

### Level 6: Analisa HPP (Tender / RKP / Realisasi)

**Frontend Route:** `/projects/[id]/[tahapId]/[itemId]/hpp`

**API Endpoints:**
- `GET /api/work-items/{workItem}/hpp` — HPP items for a specific work item
- `GET /api/wbs-phases/{wbsModel}/hpp` — All HPP items aggregated for entire WBS phase

**Primary Tables:** `project_work_items`, `project_hpp_items`

**project_hpp_items is a child table from project_work_items!**

**Columns Used - project_work_items:**
```php
- id               // itemId (used as workItem parameter)
- item_name        // Item name display
- total_budget     // Budget display
- realisasi        // Realization display
```

**Columns Used - project_hpp_items:**
```php
- id                      // HPP Item ID
- work_item_id            // FK to project_work_items (FILTERED by this)
- resource_type           // material | upah | alat | subkon | overhead
- resource_name           // e.g. "Beton K-350", "Tukang Batu", "Excavator PC200"
- hpp_tender              // Unit price at tender/BQ stage (IDR)
- hpp_rkp                 // Unit price at internal plan/RKP stage (IDR)
- realisasi               // Actual unit price (IDR)
- total_tender            // volume × hpp_tender (stored)
- total_rkp               // volume × hpp_rkp (stored)
- total_realisasi         // volume × realisasi (stored)
- deviasi_rkp_realisasi   // total_rkp - total_realisasi
- deviasi_pct             // (deviasi / total_rkp) * 100
```

**Display Data:**
- HPP breakdown by resource type (material, upah, alat, subkon, overhead)
- 3-way cost comparison: HPP Tender vs HPP RKP vs Realisasi per resource
- Summary totals (aggregate tender, RKP, realisasi across all resources)
- Deviasi per resource (positive = under budget, negative = over budget)
- CPI from projects table for overall status indicator
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
projects (1) ──── (N) project_wbs ──── (N) project_work_items
    │                    │                      │
    │ (1)                │ (1)                  ├──(N) project_hpp_items [Level 6]
    │                    │                      │
    └──(N) project_progress_curves      (N) project_material_logs
                          │                      
                          │ (1)                  
                          │                      
                          └──(N) project_equipment_logs

projects (1) ──── (N) project_risks
ingestion_files (1) ──── (N) projects
ingestion_files (1) ──── (N) project_wbs
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
│  │  LEVEL 3: project_wbs                                                       │    │
│  │  ──────────────────────────────────────────────────────────────────────── │    │
│  │  PK: id                                                                   │    │
│  │  FK: project_id → projects.id                                            │    │
│  │  FK: ingestion_file_id → ingestion_files.id (nullable)                    │    │
│  │  Columns: name_of_work_phase (WBS Phase Name), client_name,             │    │
│  │           project_manager, report_source, progress_prev_pct,             │    │
│  │           progress_this_pct, progress_total_pct, contract_value,         │    │
│  │           addendum_value, total_pagu (BQ External),                       │    │
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
│  │  FK: period_id → project_wbs.id                                          │    │
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
│  │           harga_satuan,  │ │           payment_    │ │                       │  │
│  │           total_tagihan, │ │           status     │ │                       │  │
│  │           realisasi_    │ │           source_row  │ │                       │  │
│  │           pengiriman,   │ │                      │ │                       │  │
│  │           deviasi_harga_│ │                      │ │                       │  │
│  │           market,       │ │                      │ │                       │  │
│  │           catatan_      │ │                      │ │                       │  │
│  │           monitoring,   │ │                      │ │                       │  │
│  │           is_discount    │ │                      │ │                       │  │
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
| `project_wbs` | Level 3 | WBS phase reports (BQ vs RAB) |
| `project_work_items` | Level 3, 4 | Work breakdown structure, HPP items |
| `project_material_logs` | Level 5 | Material/vendor tracking |
| `project_equipment_logs` | Level 5 | Equipment/vendor tracking |
| `project_hpp_items` | Level 6 | HPP Tender/RKP/Realisasi per resource |
| `project_progress_curves` | Level 7B | Weekly S-curve timeline data |
| `project_risks` | Level 7A | Risk register |

### Foreign Key Relationships

| From Table | From Column | To Table | To Column | Relationship |
|------------|------------|----------|-----------|--------------|
| `project_wbs` | `project_id` | `projects` | `id` | Many-to-One |
| `project_wbs` | `ingestion_file_id` | `ingestion_files` | `id` | Many-to-One |
| `project_work_items` | `period_id` | `project_wbs` | `id` | Many-to-One |
| `project_work_items` | `parent_id` | `project_work_items` | `id` | Self-referencing |
| `project_material_logs` | `period_id` | `project_wbs` | `id` | Many-to-One |
| `project_material_logs` | `work_item_id` | `project_work_items` | `id` | Many-to-One (opt) |
| `project_equipment_logs` | `period_id` | `project_wbs` | `id` | Many-to-One |
| `project_equipment_logs` | `work_item_id` | `project_work_items` | `id` | Many-to-One (opt) |
| `project_hpp_items` | `work_item_id` | `project_work_items` | `id` | Many-to-One |
| `project_progress_curves` | `project_id` | `projects` | `id` | Many-to-One |
| `project_risks` | `project_id` | `projects` | `id` | Many-to-One |
| `projects` | `ingestion_file_id` | `ingestion_files` | `id` | Many-to-One (opt) |
| `column_aliases` | `created_by` | `users` | `id` | Many-to-One (opt) |

### Unique Constraints

| Table | Columns | Description |
|-------|---------|-------------|
| `projects` | `project_code` | Unique project code |
| `project_wbs` | `project_id + name_of_work_phase` | One WBS phase per project per name |
| `project_progress_curves` | `project_id + week_number` | One curve per project per week |
| `column_aliases` | `alias + context` | One alias per context |

---

### Core Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `projects` | Main project data | `id` |
| `project_wbs` | WBS phase reports | `id` |
| `project_work_items` | WBS/HPP breakdown | `id` |
| `project_material_logs` | Material tracking | `id` |
| `project_equipment_logs` | Equipment tracking | `id` |
| `project_hpp_items` | HPP Tender/RKP/Realisasi | `id` |
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
GET    /api/projects/{id}/wbs-phases - Project WBS phases (UPDATED)
GET    /api/projects/{id}/progress-curve - Timeline data
GET    /api/projects/{id}/risks   - Risk register
GET    /api/projects/summary      - Dashboard summary
GET    /api/projects/filter-options - Filter dropdown options
```

### WBS Phase Endpoints (UPDATED)
```
GET    /api/projects/{project}/wbs-phases              - List WBS phases for a project
GET    /api/projects/{project}/wbs-phases/{wbsModel}     - Single WBS phase detail

# Work items
GET    /api/wbs-phases/{wbsModel}/work-items           - ALL work items for WBS phase

# Materials (IMPORTANT: Two different endpoints)
GET    /api/wbs-phases/{wbsModel}/materials            - ALL materials for WBS phase (not filtered by work item)
GET    /api/work-items/{workItem}/materials            - Materials filtered by SPECIFIC work item only

# Equipment (IMPORTANT: Two different endpoints)
GET    /api/wbs-phases/{wbsModel}/equipment            - ALL equipment for WBS phase (not filtered by work item)
GET    /api/work-items/{workItem}/equipment            - Equipment filtered by SPECIFIC work item only

# HPP Analysis (Level 6 - NEW)
GET    /api/work-items/{workItem}/hpp                  - HPP items for SPECIFIC work item (Tender/RKP/Realisasi)
GET    /api/wbs-phases/{wbsModel}/hpp                  - ALL HPP items aggregated for entire WBS phase
```

### Deprecated Endpoints
```
GET    /api/projects/{project}/periods               - USE /wbs-phases INSTEAD
GET    /api/projects/{project}/periods/{periodModel}  - USE /wbs-phases/{wbsModel} INSTEAD
GET    /api/periods/{periodModel}/work-items         - USE /wbs-phases/{wbsModel}/work-items INSTEAD
GET    /api/periods/{periodModel}/materials          - USE /work-items/{workItem}/materials INSTEAD (for filtered) or /wbs-phases/{wbsModel}/materials (for all)
GET    /api/periods/{periodModel}/equipment          - USE /work-items/{workItem}/equipment INSTEAD (for filtered) or /wbs-phases/{wbsModel}/equipment (for all)
```

---

## Breaking Changes (v2.0)

### Table Renames
| Old Name | New Name |
|----------|----------|
| `project_periods` | `project_wbs` |
| `period` (column) | `name_of_work_phase` |

### API Parameter Changes
| Old Parameter | New Parameter |
|---------------|---------------|
| `periodModel` | `wbsModel` |
| `periodId` | `wbsModel` (or `tahapId` in frontend) |

### Response Field Changes
| Old Field | New Field |
|-----------|-----------|
| `period` | `name_of_work_phase` |
| Added `deviasiPct` to WBS phase response | |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-04-08 | 1.0 | Initial documentation with 7-level flow mapping |
| 2024-04-08 | 1.1 | Updated filter mapping (14 filters) with new columns |
| 2024-04-08 | 1.2 | Added `deviasi_pct` to project_wbs (Level 3) |
| 2024-04-08 | 1.3 | Added `volume`, `satuan`, `harsat_internal` to project_work_items (Level 4) |
| 2024-04-08 | 1.4 | Added ERD (Entity Relationship Diagram) section |
| 2026-04-10 | 2.0 | **BREAKING**: Renamed `project_periods` → `project_wbs`, `period` → `name_of_work_phase`. Updated all API endpoints. |
| 2026-04-10 | 2.1 | **UPDATED**: Added work-item filtered endpoints (`/api/work-items/{workItem}/materials`, `/api/work-items/{workItem}/equipment`) for Level 5. Clarified difference between WBS-level and work-item-level endpoints. |

---

*Last Updated: 2026-04-10*

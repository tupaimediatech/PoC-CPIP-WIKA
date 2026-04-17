# CPIP Backend – Setup Guide

## Tech Stack

- Laravel 12 (PHP 8.2+)
- Laravel Sanctum (bearer-token auth)
- SQLite (dev default) / PostgreSQL (production)
- phpoffice/phpspreadsheet (parsing Excel)

---

## 1. Install Dependencies

```bash
composer install
```

---

## 2. Konfigurasi `.env`

Dev default (SQLite):

```env
DB_CONNECTION=sqlite
# touch database/database.sqlite
FRONTEND_URL=http://localhost:3000
```

Production (PostgreSQL):

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=cpip_db
DB_USERNAME=postgres
DB_PASSWORD=your_password

FRONTEND_URL=http://localhost:3000
```

---

## 3. Setup Database

```bash
# Generate app key
php artisan key:generate

# Jalankan migration + seed dummy data
php artisan migrate --seed
```

---

## 4. Jalankan Server

```bash
php artisan serve
# → http://127.0.0.1:8000
```

---

## 5. Authentication

Sanctum bearer token. Tiap response dari `POST /api/auth/login` berisi `token` yang harus dikirim di header:

```
Authorization: Bearer <token>
Accept: application/json
```

### Remember Me & Multi-device

- `remember: true` → token berlaku **30 hari**.
- `remember: false` (default) → token berlaku **12 jam**.
- Satu user boleh punya hingga **3 session aktif** sekaligus (laptop, phone, desktop).
  Login ke-4 akan otomatis menghapus session paling lama (berdasarkan `last_used_at`).
- Tiap token menyimpan metadata: `ip_address`, `user_agent`, `remember`.

### Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "remember": true,
    "device_name": "my-laptop"
  }'
```

Response:

```json
{
  "token": "12|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_at": "2026-05-17T07:08:29+00:00",
  "remember": true,
  "user": { "id": 1, "name": "...", "email": "user@example.com" }
}
```

### List / revoke sessions

```bash
# List semua device aktif milik user
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/auth/sessions

# Revoke session tertentu (logout dari device lain)
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/auth/sessions/22

# Logout (revoke current token saja)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/auth/logout
```

---

## 6. Shared Uploads

Semua upload Excel bersifat **global**, bukan per-user. Artinya:

- Siapa pun (yang sudah login) boleh upload.
- Semua user akan melihat seluruh `ingestion-files` dan `projects` yang pernah di-upload.
- Tidak ada ownership check pada endpoint download / reprocess.

---

## 7. API Endpoints

### Auth (`/api/auth/*`)

| Method | URL                       | Auth | Fungsi                     |
| ------ | ------------------------- | ---- | -------------------------- |
| POST   | `/auth/register`          | ❌   | Daftar user baru           |
| POST   | `/auth/login`             | ❌   | Login → return bearer token |
| POST   | `/auth/logout`            | ✅   | Revoke token yang dipakai   |
| GET    | `/auth/me`                | ✅   | Info user saat ini          |
| GET    | `/auth/sessions`          | ✅   | List semua device aktif     |
| DELETE | `/auth/sessions/{id}`     | ✅   | Revoke session tertentu     |

### Projects — Read

| Method | URL                                      | Auth | Fungsi                                           |
| ------ | ---------------------------------------- | ---- | ------------------------------------------------ |
| GET    | `/projects`                              | 🔓/✅ | List project (filter + sort)                     |
| GET    | `/projects/{id}`                         | 🔓/✅ | Detail project                                   |
| GET    | `/projects/summary`                      | 🔓/✅ | Data dashboard ringkas                           |
| GET    | `/projects/sbu-distribution`             | 🔓/✅ | Distribusi project per SBU                       |
| GET    | `/projects/filter-options`               | 🔓/✅ | Opsi untuk filter dropdown UI                    |
| GET    | `/projects/building/cpi`                 | 🔓   | Daftar CPI divisi Building                       |
| GET    | `/projects/building/spi`                 | 🔓   | Daftar SPI divisi Building                       |
| GET    | `/projects/infrastructure/cpi`           | 🔓   | Daftar CPI divisi Infrastructure                 |
| GET    | `/projects/infrastructure/spi`           | 🔓   | Daftar SPI divisi Infrastructure                 |
| GET    | `/projects/{id}/insight`                 | 🔓/✅ | AI-style insight                                 |
| GET    | `/projects/{id}/progress-curve`          | ✅   | S-curve data                                     |
| GET    | `/projects/{id}/risks`                   | ✅   | Daftar risiko                                    |
| GET    | `/projects/export-dashboard`             | ✅   | **Composite payload untuk PDF export** (§7.1)    |

> 🔓 = juga terdaftar sebagai public untuk kompatibilitas PoC; versi authenticated ada di group `auth:sanctum`.

### Projects — Write (auth required)

| Method | URL                        | Fungsi                                |
| ------ | -------------------------- | ------------------------------------- |
| POST   | `/projects`                | Create manual                         |
| PUT    | `/projects/{id}`           | Update                                |
| PATCH  | `/projects/{id}`           | Partial update                        |
| DELETE | `/projects/{id}`           | Hapus                                 |
| POST   | `/projects/upload`         | Upload Excel (lihat §9)               |
| POST   | `/projects/{id}/risks`     | Tambah risiko                         |
| PUT    | `/projects/{id}/risks/{r}` | Update risiko                         |
| DELETE | `/projects/{id}/risks/{r}` | Hapus risiko                          |

### Ingestion Files (auth required)

| Method | URL                                        | Fungsi                    |
| ------ | ------------------------------------------ | ------------------------- |
| GET    | `/ingestion-files`                         | List file upload          |
| GET    | `/ingestion-files/{id}/download`           | Download file asli        |
| POST   | `/ingestion-files/{id}/reprocess`          | Re-parse file             |

### WBS / Work Items / Materials / Equipment (auth required)

| Method | URL                                                   |
| ------ | ----------------------------------------------------- |
| GET    | `/projects/{id}/wbs-phases`                           |
| GET    | `/projects/{id}/wbs-phases/{wbs}`                     |
| GET    | `/wbs-phases/{wbs}/work-items`                        |
| GET    | `/wbs-phases/{wbs}/hpp-summary`                       |
| GET    | `/wbs-phases/{wbs}/materials`                         |
| GET    | `/wbs-phases/{wbs}/equipment`                         |
| GET    | `/work-items/{id}`                                    |
| GET    | `/work-items/{id}/materials`                          |
| GET    | `/work-items/{id}/equipment`                          |

### Column Aliases

| Method | URL                          | Auth | Fungsi                         |
| ------ | ---------------------------- | ---- | ------------------------------ |
| GET    | `/column-aliases`            | ❌   | List                           |
| GET    | `/column-aliases/{id}`       | ❌   | Detail                         |
| POST   | `/column-aliases`            | ✅   | Tambah alias                   |
| PUT    | `/column-aliases/{id}`       | ✅   | Update                         |
| DELETE | `/column-aliases/{id}`       | ✅   | Hapus                          |

### Harsat

| Method | URL              | Auth | Fungsi            |
| ------ | ---------------- | ---- | ----------------- |
| GET    | `/harsat/trend`  | ❌   | Data trend harsat |
| POST   | `/harsat`        | ✅   | Tambah data       |

### Roles (auth required)

| Method | URL                         | Fungsi                  |
| ------ | --------------------------- | ----------------------- |
| GET    | `/roles`                    | List role               |
| GET    | `/users/{id}/role`          | Role user tertentu      |
| PATCH  | `/users/{id}/role`          | Assign role ke user     |

### Query Params umum (GET /api/projects)

```
?division=Infrastructure
?sort_by=cpi&sort_dir=asc
?min_contract=500
?status=critical
?year=2024
```

---

### 7.1 Export Dashboard

`GET /api/projects/export-dashboard` mengembalikan **satu payload gabungan** yang isinya identik dengan data yang dirender Home dashboard (6 request terpisah) — dipakai oleh fitur PDF export supaya dashboard & PDF tidak pernah drift.

Query params (forwarded ke underlying method): `division`, `sbu`, `year`, `status`.

Response shape:

```json
{
  "generated_at": "2026-04-17T07:08:09+00:00",
  "filters":       { "division": "Building", "year": "2024" },
  "summary":       { "total_projects": ..., "avg_cpi": ..., "by_division": [...], ... },
  "sbu_distribution": [ ... ],
  "filter_options":   { "division": [...], "sbu": [...], "year": [...], ... },
  "division_kpis": {
    "building_cpi":       [ ... ],
    "building_spi":       [ ... ],
    "infrastructure_cpi": [ ... ],
    "infrastructure_spi": [ ... ]
  },
  "projects": { "data": [ ... ], "meta": { ... } }
}
```

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/json" \
     "http://127.0.0.1:8000/api/projects/export-dashboard?division=Building&year=2024"
```

---

## 8. KPI Formula

```
CPI = planned_cost / actual_cost
SPI = planned_duration / actual_duration

Status:
  good     → CPI >= 1 DAN SPI >= 1        (hijau)
  warning  → salah satu < 1               (kuning)
  critical → CPI < 0.9 ATAU SPI < 0.9     (merah)
```

KPI **dihitung otomatis** setiap kali data disimpan (insert/update) lewat model boot hook di `Project.php` → `KpiCalculatorService`.

---

## 9. Format Excel Upload

File: `.xlsx` atau `.xls`, max 5MB.

Baris pertama **wajib** header (nama kolom):

| Kolom            | Wajib | Keterangan                       |
| ---------------- | ----- | -------------------------------- |
| project_code     | ✅    | Unik, max 20 karakter            |
| project_name     | ✅    | Nama project                     |
| division         | ❌    | `Infrastructure` atau `Building` |
| owner            | ❌    | Pemilik project                  |
| contract_value   | ❌    | Nilai kontrak (Juta)             |
| planned_cost     | ❌    | Rencana biaya (Juta)             |
| actual_cost      | ❌    | Biaya aktual (Juta)              |
| planned_duration | ❌    | Durasi rencana (bulan)           |
| actual_duration  | ❌    | Durasi aktual (bulan)            |
| progress_pct     | ❌    | Progress % (default 100)         |

> ⚠️ Jika `project_code` sudah ada di DB → data akan di-**update** (bukan duplikat).
> ⚠️ Header alternatif (ID/EN) otomatis di-resolve lewat `WorkbookFieldMapper` + tabel `column_aliases`.

---

## 10. Struktur File

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php            ← login, logout, sessions
│   │   └── ProjectController.php         ← semua endpoint project + export-dashboard
│   └── Requests/
│       ├── ProjectRequest.php            ← validasi create/update
│       └── UploadExcelRequest.php        ← validasi upload
├── Models/
│   ├── Project.php                       ← model + auto-calculate KPI
│   └── IngestionFile.php                 ← metadata file upload
└── Services/
    ├── ProjectImport.php                 ← parsing Excel → DB
    ├── PolaBImport.php                   ← variant parser
    ├── PolaCImport.php                   ← variant parser
    ├── AdaptiveWorkbookImport.php        ← multi-sheet adaptive parser
    ├── WorkbookFieldMapper.php           ← header alias resolver
    └── KpiCalculatorService.php          ← formula CPI, SPI, status

database/
├── migrations/
│   ├── ..._create_projects_table.php
│   ├── ..._drop_user_id_from_projects_and_ingestion_files.php
│   └── ..._add_device_fields_to_personal_access_tokens.php
└── seeders/
    ├── DatabaseSeeder.php
    └── ProjectSeeder.php

routes/
└── api.php                               ← source of truth untuk endpoint
```

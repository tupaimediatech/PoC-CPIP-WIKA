export type ProjectStatus = "good" | "warning" | "critical" | "unknown";
export type Division = "Infrastructure" | "Building";
export type IngestionStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "partial";
export type AliasContext =
  | "project"
  | "work_item"
  | "material"
  | "equipment"
  | "period"
  | "s_curve";

export interface Project {
  id: number;
  project_code: string;
  project_name: string;
  division: Division;
  sbu: string | null;
  owner: string | null;
  contract_type: string | null;
  payment_method: string | null;
  partnership: string | null;
  funding_source: string | null;
  location: string | null;
  contract_value: string;
  planned_cost: string;
  actual_cost: string;
  planned_duration: number;
  actual_duration: number;
  progress_pct: string;
  gross_profit_pct: string | null;
  project_year: number;
  start_date: string | null;
  cpi: string | null;
  spi: string | null;
  status: ProjectStatus;
  ingestion_file_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPeriod {
  id: number;
  project_id: number;
  ingestion_file_id: number | null;
  period: string;
  client_name: string | null;
  project_manager: string | null;
  report_source: string | null;
  progress_prev_pct: string | null;
  progress_this_pct: string | null;
  progress_total_pct: string | null;
  contract_value: string | null;
  addendum_value: string | null;
  total_pagu: string | null;
  hpp_plan_total: string | null;
  hpp_actual_total: string | null;
  hpp_deviation: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWorkItem {
  id: number;
  period_id: number;
  parent_id: number | null;
  level: number;
  item_no: string | null;
  item_name: string;
  sort_order: number | null;
  budget_awal: string | null;
  addendum: string | null;
  total_budget: string | null;
  realisasi: string | null;
  deviasi: string | null;
  deviasi_pct: string | null;
  is_total_row: boolean;
  children: ProjectWorkItem[];
}

export interface ProjectMaterialLog {
  id: number;
  period_id: number;
  work_item_id: number | null;
  supplier_name: string | null;
  material_type: string | null;
  qty: string | null;
  satuan: string | null;
  harga_satuan: string | null;
  total_tagihan: string | null;
  is_discount: boolean;
  source_row: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEquipmentLog {
  id: number;
  period_id: number;
  work_item_id: number | null;
  vendor_name: string | null;
  equipment_name: string | null;
  jam_kerja: string | null;
  rate_per_jam: string | null;
  total_biaya: string | null;
  payment_status: string | null;
  source_row: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectProgressCurve {
  id: number;
  project_id: number;
  week_number: number | null;
  week_date: string | null;
  rencana_pct: string | null;
  realisasi_pct: string | null;
  deviasi_pct: string | null;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListMeta {
  total: number;
  overbudget_count: number;
  delay_count: number;
  overbudget_pct: number;
  delay_pct: number;
  available_years: number[];
  active_year: number | null;
}

export interface ProjectListResponse {
  data: Project[];
  meta: ProjectListMeta;
}

export interface ProjectPeriodListResponse {
  data: ProjectPeriod[];
}

export interface ProjectWorkItemListResponse {
  data: ProjectWorkItem[];
}

export interface MaterialLogListResponse {
  data: ProjectMaterialLog[];
  meta: {
    total_tagihan: number;
    total_rows: number;
    discount_rows: number;
  };
}

export interface EquipmentLogListResponse {
  data: ProjectEquipmentLog[];
  meta: {
    total_biaya: number;
    total_rows: number;
    pending_count: number;
  };
}

export interface ProgressCurveListResponse {
  data: ProjectProgressCurve[];
}

export interface DivisionSummary {
  total: number;
  avg_cpi: number;
  avg_spi: number;
  overbudget_count: number;
  delay_count: number;
}

export interface ParetoItem {
  name: string;
  pct: string;
}

export interface SbuDistributionItem {
  label: string;
  value: number;
}

export interface FilterOptionsResponse {
  division: string[];
  sbu: string[];
  owner: string[];
  contract_type: string[];
  payment_method: string[];
  partnership: string[];
  funding_source: string[];
  location: string[];
  year: number[];
  consultant: string[];
  profit_center: string[];
  project_duration: string[];
}

export interface SummaryResponse {
  total_projects: number;
  avg_cpi: number;
  avg_spi: number;
  overbudget_count: number;
  delay_count: number;
  overbudget_pct: number;
  delay_pct: number;
  by_division: Record<Division, DivisionSummary>;
  status_breakdown: Record<ProjectStatus, number>;
  profitability: ParetoItem[];
  overrun: ParetoItem[];
}

// Level 3 — project phases
export interface ProjectPhase {
  id: number;
  name: string;
  bqExternal: number;
  rabInternal: number;
  realisasi: number;
  deviasi: number;
}

export interface ProjectPhaseListResponse {
  data: {
    project_name: string;
    sbu: string | null;
    owner: string | null;
    contract_type: string | null;
    phases: ProjectPhase[];
  };
}

// Level 4 — work items
export interface WorkItemLevel4 {
  id: number;
  name: string;
  item_no: string | null;
  totalBiaya: number;
  realisasi: number;
  deviasi: number;
  deviasi_pct: number;
  is_total_row: boolean;
  children: WorkItemLevel4[];
  volume: number | null;
  satuan: string | null;
  internalPrice: number | null;
  harsatInternal: number | null;
  totalCost: number | null;
  unit: string | null;
}

export interface WorkItemLevel4ListResponse {
  data: {
    tahap: string;
    rabInternal: number;
    items: WorkItemLevel4[];
  };
}

// Level 5 — material/vendor
export interface MaterialLogLevel5 {
  id: number;
  work_item_id: number | null;
  material_type: string | null;
  volume: number | null;
  satuan: string | null;
  is_discount: boolean;
  vendor: {
    nama: string | null;
    tahunPerolehan: string | null;
    lokasi: string | null;
    ratingPerforma: string | null;
  };
  kontrak: {
    nilaiKontrak: string | null;
    hargaSatuan: string | null;
    realisasiPengiriman: string | null;
    deviasiHargaMarket: string | null;
  };
  catatanMonitoring: string | null;
}

export interface MaterialLogLevel5ListResponse {
  data: MaterialLogLevel5[];
  meta: { total_tagihan: number; total_rows: number };
}

// Level 7 — risks
export interface ProjectRisk {
  id: number;
  risk_code: string | null;
  risk_title: string;
  risk_description: string | null;
  category: string | null;
  financial_impact_idr: string | null;
  probability: number | null;
  impact: number | null;
  severity: string | null;
  mitigation: string | null;
  status: string | null;
  owner: string | null;
  identified_at: string | null;
  target_resolved_at: string | null;
}

export interface RiskListResponse {
  data: ProjectRisk[];
  meta: {
    total: number;
    open_count: number;
    critical_count: number;
    total_financial_impact: number;
  };
}

// Level 7 — progress curve (new format)
export interface ProjectTimeline {
  start_date: string | null;
  planned_end: string | null;
  actual_end: string | null;
  planned: string | null;
  actual: string | null;
  delay_months: number;
  delay_note: string;
}

export interface ProgressCurveResponse {
  data: {
    timeline: ProjectTimeline;
    spi_value: number;
    spi_status: string;
    sCurve: {
      months: string[];
      plan: number[];
      actual: number[];
    } | null;
  };
}

export interface FileUploadResult {
  file_id: number;
  file_name: string;
  status: IngestionStatus;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: string[];
  warnings?: string[];
  scanner?: string;
  suggestion?: string | null;
  unrecognized_columns?: string[];
  field_trace?: Record<string, unknown>;
  field_candidates?: Record<string, unknown>;
  field_conflicts?: Record<string, unknown>;
  project_row_trace?: Record<string, unknown>;
  project_row_conflicts?: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  total_rows?: number;
  imported?: number;
  skipped?: number;
  errors?: string[];
  warnings?: string[];
  results: FileUploadResult[];
}

export interface IngestionFile {
  id: number;
  original_name: string;
  stored_path: string;
  disk: string;
  status: IngestionStatus;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  errors: string[] | null;
  processed_at: string | null;
  projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface IngestionFileListResponse {
  data: IngestionFile[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type DashboardFilters = {
  division: string;
  contractRange: string;
  year: string;
};

export type InsightLevel = "info" | "warning" | "critical";

export interface InsightBullet {
  level: InsightLevel;
  text: string;
}

export interface InsightResponse {
  bullets: InsightBullet[];
  summary: {
    level: InsightLevel;
    text: string;
  };
}

export interface IngestionLog {
  id: number;
  file_name: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: "SUCCESS" | "FAILED" | "PARTIAL" | "PENDING" | "PROCESSING";
  processed_at: string | null;
}

export interface IngestionLogResponse {
  data: IngestionLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ColumnAlias {
  id: number;
  alias: string;
  target_field: string;
  context: AliasContext | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnAliasListResponse {
  data: ColumnAlias[];
}

// ── Consolidated single-call response types ───────────────────────────────────

export interface WorkItemSummary {
  id: number;
  name: string;
  item_no: string | null;
  volume: number | null;
  satuan: string | null;
}

/** GET /work-items/{id}/detail — Level 4 Detail */
export interface WorkItemDetailResponse {
  data: {
    tahap: string;
    rabInternal: number;
    workItem: WorkItemSummary;
    materials: MaterialLogLevel5[];
  };
}

/** GET /materials/{id} — Level 5 */
export interface MaterialDetailResponse {
  data: {
    tahap: string;
    workItem: WorkItemSummary | null;
    material: MaterialLogLevel5;
  };
}

/** GET /work-items/{id}/hpp — Level 6 */
export interface WorkItemHppResponse {
  data: {
    tahap: string;
    rabInternal: number;
    realisasi: number;
    workItem: WorkItemSummary;
    cpi: number;
    insight: InsightResponse;
  };
}

/** GET /projects/{id}/risk-timeline — Level 7 */
export interface RiskTimelineResponse {
  data: {
    risks: ProjectRisk[];
    risks_meta: {
      total: number;
      open_count: number;
      critical_count: number;
      total_financial_impact: number;
    };
    timeline: ProjectTimeline | null;
    spi_value: number;
    spi_status: string;
    sCurve: {
      months: string[];
      plan: number[];
      actual: number[];
    } | null;
  };
}

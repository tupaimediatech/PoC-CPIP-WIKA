import axios from "axios";
import type {
  ProjectListResponse,
  SummaryResponse,
  Project,
  UploadResponse,
  IngestionFileListResponse,
  InsightResponse,
  IngestionLogResponse,
  ColumnAlias,
  ColumnAliasListResponse,
  AliasContext,
  ProjectPeriodListResponse,
  ProjectWorkItemListResponse,
  MaterialLogListResponse,
  EquipmentLogListResponse,
  ProgressCurveListResponse,
  FilterOptionsResponse,
  SbuDistributionItem,
  ProjectPhaseListResponse,
  WorkItemLevel4ListResponse,
  MaterialLogLevel5ListResponse,
  WorkItemDetailResponse,
  HppSummaryResponse,
  RiskListResponse,
  ProgressCurveResponse,
  ProjectCpiResponse,
  ProjectSpiResponse,
} from "@/types/project";
import { getToken, clearToken } from "@/lib/auth";
import { Material, MaterialFilterOptionsResponse, MaterialListResponse } from "@/types/material";

type UploadRequestError = Error & {
  responseData?: UploadResponse;
};

function decodeHtmlError(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseXhrPayload(xhr: XMLHttpRequest): UploadResponse | null {
  const raw = xhr.responseText?.trim();

  if (!raw) {
    return null;
  }

  const contentType = xhr.getResponseHeader("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return JSON.parse(raw) as UploadResponse;
  }

  if (raw.startsWith("{") || raw.startsWith("[")) {
    return JSON.parse(raw) as UploadResponse;
  }

  return null;
}

function buildUploadError(xhr: XMLHttpRequest, data: UploadResponse | null): UploadRequestError {
  const htmlMessage = decodeHtmlError(xhr.responseText ?? "");
  const message = data?.message ?? htmlMessage ?? "Server mengembalikan response yang bukan JSON.";

  const err: UploadRequestError = new Error(message);

  if (data) {
    err.responseData = data;
  }

  return err;
}

const api = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
});

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================================
// Projects
// ============================================================

export type ProjectFilters = {
  division?: string;
  sbu?: string;
  location?: string;
  partnership?: string;
  status?: string;
  year?: number;
  sort_by?: "cpi" | "spi" | "contract_value" | "project_name" | "gross_profit_pct";
  sort_dir?: "asc" | "desc";
  min_contract?: number;
  max_contract?: number;
};

export const projectApi = {
  list: (filters: ProjectFilters = {}): Promise<ProjectListResponse> => api.get("/projects", { params: filters }).then((r) => r.data),

  summary: (): Promise<SummaryResponse> => api.get("/projects/summary").then((r) => r.data),

  detail: (id: number): Promise<{ data: Project }> => api.get(`/projects/${id}`).then((r) => r.data),

  insight: (id: number): Promise<InsightResponse> => api.get(`/projects/${id}/insight`).then((r) => r.data),

  periods: (id: number): Promise<ProjectPhaseListResponse> => api.get(`/projects/${id}/wbs-phases`).then((r) => r.data),

  progressCurve: (id: number): Promise<ProgressCurveResponse> => api.get(`/projects/${id}/progress-curve`).then((r) => r.data),

  risks: (id: number): Promise<RiskListResponse> => api.get(`/projects/${id}/risks`).then((r) => r.data),

  filterOptions: (): Promise<FilterOptionsResponse> => api.get("/projects/filter-options").then((r) => r.data),

  sbuDistribution: (): Promise<{ data: SbuDistributionItem[] }> => api.get("/projects/sbu-distribution").then((r) => r.data),

  upload: (files: File | File[], onProgress?: (percent: number) => void): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      const fileArray = Array.isArray(files) ? files : [files];
      fileArray.forEach((file) => form.append("files[]", file));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/projects/upload");
      xhr.setRequestHeader("Accept", "application/json");
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = parseXhrPayload(xhr);

          if (xhr.status >= 200 && xhr.status < 300) {
            if (data) {
              resolve(data);
              return;
            }

            reject(buildUploadError(xhr, null));
            return;
          }

          reject(buildUploadError(xhr, data));
        } catch {
          reject(buildUploadError(xhr, null));
        }
      };

      xhr.onerror = () => reject(new Error("Network Error"));
      xhr.send(form);
    });
  },

  uploadSingle: (file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("files[]", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/projects/upload");
      xhr.setRequestHeader("Accept", "application/json");
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = parseXhrPayload(xhr);

          if (xhr.status >= 200 && xhr.status < 300) {
            if (data) {
              resolve(data);
              return;
            }

            reject(buildUploadError(xhr, null));
            return;
          }

          reject(buildUploadError(xhr, data));
        } catch {
          reject(buildUploadError(xhr, null));
        }
      };

      xhr.onerror = () => reject(new Error("Network Error"));
      xhr.send(form);
    });
  },

  delete: (id: number): Promise<{ message: string }> => api.delete(`/projects/${id}`).then((r) => r.data),

  exportDashboard: (filters: ProjectFilters = {}): Promise<DashboardExportResponse> =>
    api.get("/projects/export-dashboard", { params: filters }).then((r) => r.data),

  getCpi: (division: string): Promise<ProjectCpiResponse> => api.get(`/projects/${division.toLowerCase()}/cpi`).then((r) => r.data),
  getSpi: (division: string): Promise<ProjectSpiResponse> => api.get(`/projects/${division.toLowerCase()}/spi`).then((r) => r.data),
};

export type DashboardExportResponse = {
  generated_at: string;
  filters: ProjectFilters;
  summary: SummaryResponse;
  sbu_distribution: SbuDistributionItem[];
  filter_options: FilterOptionsResponse;
  division_kpis: {
    building_cpi: Project[];
    building_spi: Project[];
    infrastructure_cpi: Project[];
    infrastructure_spi: Project[];
  };
  projects: ProjectListResponse;
};

export const periodApi = {
  workItems: (periodId: number): Promise<WorkItemLevel4ListResponse> => api.get(`/wbs-phases/${periodId}/work-items`).then((r) => r.data),

  materials: (periodId: number): Promise<MaterialLogLevel5ListResponse> => api.get(`/wbs-phases/${periodId}/materials`).then((r) => r.data),

  equipment: (periodId: number): Promise<EquipmentLogListResponse> => api.get(`/wbs-phases/${periodId}/equipment`).then((r) => r.data),

  hppSummary: (periodId: number): Promise<HppSummaryResponse> => api.get(`/wbs-phases/${periodId}/hpp-summary`).then((r) => r.data),
};

export const workItemApi = {
  detail: (id: number): Promise<WorkItemDetailResponse> => api.get(`/work-items/${id}`).then((r) => r.data),
};

export const materialApi = {
  list: (): Promise<MaterialListResponse> => api.get("/materials").then((r) => r.data),

  filterOptions: (): Promise<MaterialFilterOptionsResponse> => api.get("/materials/filter-options").then((r) => r.data),

  detail: (id: number): Promise<{ data: Material }> => api.get(`/materials/${id}`).then((r) => r.data),

  delete: (id: number): Promise<{ message: string }> => api.delete(`/materials/${id}`).then((r) => r.data),

  upload: (files: File | File[], onProgress?: (percent: number) => void): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      const fileArray = Array.isArray(files) ? files : [files];
      fileArray.forEach((file) => form.append("files[]", file));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/materials/upload");
      xhr.setRequestHeader("Accept", "application/json");
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = parseXhrPayload(xhr);
          if (xhr.status >= 200 && xhr.status < 300) {
            if (data) {
              resolve(data);
              return;
            }
            reject(buildUploadError(xhr, null));
            return;
          }
          reject(buildUploadError(xhr, data));
        } catch {
          reject(buildUploadError(xhr, null));
        }
      };

      xhr.onerror = () => reject(new Error("Network Error"));
      xhr.send(form);
    });
  },
};

export const ingestionApi = {
  list: (perPage = 15): Promise<IngestionFileListResponse> => api.get("/ingestion-files", { params: { per_page: perPage } }).then((r) => r.data),

  downloadUrl: (id: number): string => `/api/ingestion-files/${id}/download`,

  reprocess: (id: number): Promise<UploadResponse> => api.post(`/ingestion-files/${id}/reprocess`).then((r) => r.data),

  ingestionLog: (perPage = 15): Promise<IngestionLogResponse> => api.get("/ingestion-log", { params: { per_page: perPage } }).then((r) => r.data),
};

export type LoginResponse = {
  user: { id: number; name: string; email: string; role?: string };
  token: string;
  expires_at: string | null;
};

export type SessionItem = {
  id: number;
  name: string;
  ip_address: string | null;
  user_agent: string | null;
  remember: boolean;
  last_used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  is_current: boolean;
};

function currentDeviceName(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent || "unknown";
}

export const authApi = {
  login: (email: string, password: string, remember = false): Promise<LoginResponse> =>
    api
      .post("/auth/login", {
        email,
        password,
        remember,
        device_name: currentDeviceName(),
      })
      .then((r) => r.data),

  register: (name: string, email: string, password: string, password_confirmation: string): Promise<LoginResponse> =>
    api.post("/auth/register", { name, email, password, password_confirmation }).then((r) => r.data),

  logout: () => api.post("/auth/logout").then((r) => r.data),

  me: () => api.get("/auth/me").then((r) => r.data),

  sessions: (): Promise<{ data: SessionItem[] }> => api.get("/auth/sessions").then((r) => r.data),

  revokeSession: (id: number) => api.delete(`/auth/sessions/${id}`).then((r) => r.data),
};

export type ColumnAliasFilters = {
  context?: AliasContext | "";
  active_only?: boolean;
  q?: string;
};

export type ColumnAliasPayload = {
  alias: string;
  target_field: string;
  context: AliasContext | null;
  is_active?: boolean;
};

export const harsatApi = {
  trend: (): Promise<{ data: { years: string[]; categories: { key: string; label: string; color: string }[]; data: Record<string, number[]> } | null }> =>
    api.get("/harsat/trend").then((r) => r.data),
};

export const columnAliasApi = {
  list: (filters: ColumnAliasFilters = {}): Promise<ColumnAliasListResponse> => api.get("/column-aliases", { params: filters }).then((r) => r.data),

  detail: (id: number): Promise<{ data: ColumnAlias }> => api.get(`/column-aliases/${id}`).then((r) => r.data),

  create: (payload: ColumnAliasPayload): Promise<{ data: ColumnAlias }> => api.post("/column-aliases", payload).then((r) => r.data),

  update: (id: number, payload: Partial<ColumnAliasPayload>): Promise<{ data: ColumnAlias }> =>
    api.patch(`/column-aliases/${id}`, payload).then((r) => r.data),

  remove: (id: number): Promise<{ message: string; data: ColumnAlias }> => api.delete(`/column-aliases/${id}`).then((r) => r.data),
};

// Tambahkan setelah interceptors.request
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      // Redirect ke login — gunakan window karena ini di luar komponen React
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

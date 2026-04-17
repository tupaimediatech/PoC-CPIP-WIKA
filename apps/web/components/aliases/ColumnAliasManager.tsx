"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { columnAliasApi } from "@/lib/api";
import type { AliasContext, ColumnAlias } from "@/types/project";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

const CONTEXT_OPTIONS: Array<{ value: AliasContext; label: string }> = [
  { value: "project", label: "Project" },
  { value: "work_item", label: "Work Item" },
  { value: "material", label: "Material" },
  { value: "equipment", label: "Equipment" },
  { value: "period", label: "Period" },
  { value: "s_curve", label: "S-Curve" },
];

const TARGET_FIELD_OPTIONS: Record<AliasContext, string[]> = {
  project: [
    "project_code",
    "project_name",
    "project_year",
    "division",
    "owner",
    "client_name",
    "project_manager",
    "contract_value",
    "addendum_value",
    "bq_external",
    "planned_cost",
    "actual_cost",
    "planned_duration",
    "actual_duration",
    "progress_pct",
    "progress_prev_pct",
    "progress_this_pct",
    "progress_total_pct",
    "period",
  ],
  work_item: [
    "item_no",
    "item_name",
    "budget_awal",
    "addendum",
    "total_budget",
    "realisasi",
    "deviasi",
    "deviasi_pct",
  ],
  material: [
    "supplier_name",
    "material_type",
    "qty",
    "satuan",
    "harga_satuan",
    "total_tagihan",
    "is_discount",
  ],
  equipment: [
    "vendor_name",
    "equipment_name",
    "jam_kerja",
    "rate_per_jam",
    "total_biaya",
    "payment_status",
  ],
  period: [
    "period",
    "client_name",
    "project_manager",
    "report_source",
    "progress_prev_pct",
    "progress_this_pct",
    "progress_total_pct",
    "contract_value",
    "addendum_value",
    "bq_external",
    "actual_costs",
    "realized_costs",
    "hpp_deviation",
  ],
  s_curve: [
    "week_number",
    "rencana_pct",
    "realisasi_pct",
    "deviasi_pct",
    "keterangan",
  ],
};

type FormState = {
  alias: string;
  target_field: string;
  context: AliasContext;
  is_active: boolean;
};

const INITIAL_FORM: FormState = {
  alias: "",
  target_field: "project_code",
  context: "project",
  is_active: true,
};

function formatContext(value: AliasContext | null): string {
  if (!value) return "All";

  return CONTEXT_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function extractApiError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const response = (error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | undefined>;
        };
      };
    }).response;

    const aliasMessage = response?.data?.errors?.alias?.[0];
    const targetFieldMessage = response?.data?.errors?.target_field?.[0];
    const message = response?.data?.message;

    if (aliasMessage) return aliasMessage;
    if (targetFieldMessage) return targetFieldMessage;
    if (message) return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

export default function ColumnAliasManager() {
  const [aliases, setAliases] = useState<ColumnAlias[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedContext, setSelectedContext] = useState<AliasContext | "">("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const targetFieldOptions = useMemo(() => {
    return TARGET_FIELD_OPTIONS[form.context];
  }, [form.context]);

  const loadAliases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await columnAliasApi.list({
        context: selectedContext,
        active_only: !showInactive,
        q: search || undefined,
      });

      setAliases(response.data);
    } catch (error: unknown) {
      setError(extractApiError(error) || "Gagal memuat data alias.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedContext, showInactive]);

  useEffect(() => {
    void loadAliases();
  }, [loadAliases]);

  useEffect(() => {
    if (!targetFieldOptions.includes(form.target_field)) {
      setForm((prev) => ({
        ...prev,
        target_field: targetFieldOptions[0] ?? "",
      }));
    }
  }, [targetFieldOptions, form.target_field]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function handleEdit(alias: ColumnAlias) {
    setEditingId(alias.id);
    setForm({
      alias: alias.alias,
      target_field: alias.target_field,
      context: (alias.context ?? "project") as AliasContext,
      is_active: alias.is_active,
    });
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        alias: form.alias,
        target_field: form.target_field,
        context: form.context,
        is_active: form.is_active,
      };

      if (editingId) {
        await columnAliasApi.update(editingId, payload);
        setSuccess("Alias berhasil diperbarui.");
      } else {
        await columnAliasApi.create(payload);
        setSuccess("Alias berhasil ditambahkan.");
      }

      resetForm();
      await loadAliases();
    } catch (error: unknown) {
      setError(extractApiError(error) || "Gagal menyimpan alias.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(alias: ColumnAlias) {
    setError("");
    setSuccess("");

    try {
      await columnAliasApi.update(alias.id, { is_active: !alias.is_active });
      setSuccess(`Alias ${alias.is_active ? "dinonaktifkan" : "diaktifkan"} kembali.`);
      await loadAliases();
    } catch (error: unknown) {
      setError(extractApiError(error) || "Gagal mengubah status alias.");
    }
  }

  async function handleDelete(alias: ColumnAlias) {
    setError("");
    setSuccess("");

    try {
      await columnAliasApi.remove(alias.id);
      setSuccess("Alias berhasil dinonaktifkan.");
      if (editingId === alias.id) {
        resetForm();
      }
      await loadAliases();
    } catch (error: unknown) {
      setError(extractApiError(error) || "Gagal menonaktifkan alias.");
    }
  }

  return (
    <div
      className="bg-white flex flex-col"
      style={{ width: "1139px", minHeight: "1024px", padding: "16px", margin: "16px", boxSizing: "border-box" }}
    >
      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-dark-gray">
                {editingId ? "Edit Alias" : "Tambah Alias"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Kelola mapping header Excel ke field standar ingestion.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="btn-outline"
            >
              Reset
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-dark-gray">
                Alias Header
              </label>
              <input
                value={form.alias}
                onChange={(event) => setForm((prev) => ({ ...prev, alias: event.target.value }))}
                placeholder="Contoh: Nama Kontrak"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary-blue"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Sistem akan otomatis menormalisasi menjadi format seperti <span className="font-mono">nama_kontrak</span>.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-dark-gray">
                Context
              </label>
              <select
                value={form.context}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    context: event.target.value as AliasContext,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary-blue"
              >
                {CONTEXT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-dark-gray">
                Target Field
              </label>
              <select
                value={form.target_field}
                onChange={(event) => setForm((prev) => ({ ...prev, target_field: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary-blue"
              >
                {targetFieldOptions.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-dark-gray">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
              />
              Aktif saat disimpan
            </label>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              {submitting ? "Menyimpan..." : editingId ? "Update Alias" : "Tambah Alias"}
            </button>
          </form>
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-dark-gray">Daftar Alias</h2>
              <p className="mt-1 text-sm text-gray-500">
                Cari alias, filter per context, lalu edit atau nonaktifkan bila diperlukan.
              </p>
            </div>

            <button type="button" onClick={() => void loadAliases()} className="btn-outline inline-flex items-center gap-2">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari alias atau target field"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary-blue"
              />
            </label>

            <select
              value={selectedContext}
              onChange={(event) => setSelectedContext(event.target.value as AliasContext | "")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary-blue"
            >
              <option value="">Semua Context</option>
              {CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-dark-gray">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
            />
            Tampilkan alias nonaktif
          </label>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_132px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Alias</span>
              <span>Target Field</span>
              <span>Context</span>
              <span>Status</span>
              <span className="text-right">Aksi</span>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                Memuat data alias...
              </div>
            ) : aliases.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                Belum ada alias yang cocok dengan filter saat ini.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {aliases.map((alias) => (
                  <div
                    key={alias.id}
                    className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_132px] gap-3 px-4 py-3 text-sm text-dark-gray"
                  >
                    <div>
                      <p className="font-semibold text-dark-gray">{alias.alias}</p>
                      <p className="mt-1 text-xs text-gray-500">ID #{alias.id}</p>
                    </div>
                    <div className="font-mono text-xs text-gray-700">{alias.target_field}</div>
                    <div>{formatContext(alias.context)}</div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          alias.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {alias.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(alias)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                        title="Edit alias"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(alias)}
                        className="inline-flex rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        {alias.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(alias)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                        title="Nonaktifkan alias"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

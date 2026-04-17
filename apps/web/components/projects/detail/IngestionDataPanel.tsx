"use client";

import { useEffect, useMemo, useState } from "react";
import { periodApi, projectApi } from "@/lib/api";
import type {
  EquipmentLogListResponse,
  MaterialLogListResponse,
  ProjectEquipmentLog,
  ProjectMaterialLog,
  ProjectPeriod,
  ProjectProgressCurve,
  ProjectWorkItem,
} from "@/types/project";

type Props = {
  projectId: number;
};

type TabKey = "overview" | "work_items" | "materials" | "equipment" | "curve";

type FlattenedWorkItem = ProjectWorkItem & {
  depth: number;
};

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "work_items", label: "Work Items" },
  { key: "materials", label: "Materials" },
  { key: "equipment", label: "Equipment" },
  { key: "curve", label: "Progress Curve" },
];

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatNumber(value: string | number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return `${formatNumber(numeric, 2)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function flattenWorkItems(items: ProjectWorkItem[], depth = 0): FlattenedWorkItem[] {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenWorkItems(item.children ?? [], depth + 1),
  ]);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function IngestionDataPanel({ projectId }: Props) {
  const [periods, setPeriods] = useState<ProjectPeriod[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [workItems, setWorkItems] = useState<ProjectWorkItem[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterialLog[]>([]);
  const [equipment, setEquipment] = useState<ProjectEquipmentLog[]>([]);
  const [progressCurves, setProgressCurves] = useState<ProjectProgressCurve[]>([]);
  const [materialMeta, setMaterialMeta] = useState<MaterialLogListResponse["meta"] | null>(null);
  const [equipmentMeta, setEquipmentMeta] = useState<EquipmentLogListResponse["meta"] | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      projectApi.periods(projectId),
      projectApi.progressCurve(projectId),
    ])
      .then(([periodRes, curveRes]) => {
        if (cancelled) {
          return;
        }

        setPeriods(periodRes.data as unknown as ProjectPeriod[]);
        setProgressCurves(curveRes.data as unknown as ProjectProgressCurve[]);
        setError("");
        if ((periodRes.data as unknown as ProjectPeriod[]).length === 0) {
          setLoadingDetails(false);
        }
        const periodsArr = periodRes.data as unknown as ProjectPeriod[];
        setActivePeriodId((current) => {
          if (current && periodsArr.some((period) => period.id === current)) {
            return current;
          }

          return periodsArr[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat detail hasil ingestion.");
          setLoadingDetails(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPeriods(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!activePeriodId) {
      return;
    }

    let cancelled = false;

    Promise.all([
      periodApi.workItems(activePeriodId),
      periodApi.materials(activePeriodId),
      periodApi.equipment(activePeriodId),
    ])
      .then(([workRes, materialRes, equipmentRes]) => {
        if (cancelled) {
          return;
        }

        setWorkItems(workRes.data as unknown as ProjectWorkItem[]);
        setMaterials(materialRes.data as unknown as ProjectMaterialLog[]);
        setEquipment(equipmentRes.data as unknown as ProjectEquipmentLog[]);
        setMaterialMeta(materialRes.meta as any);
        setEquipmentMeta(equipmentRes.meta as any);
        setError("");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat rincian data ingestion.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePeriodId]);

  const activePeriod = periods.find((period) => period.id === activePeriodId) ?? null;
  const flattenedWorkItems = useMemo(
    () => flattenWorkItems(workItems),
    [workItems],
  );

  const totalWorkBudget = flattenedWorkItems.reduce(
    (sum, item) => sum + Number(item.total_budget ?? 0),
    0,
  );
  const totalWorkActual = flattenedWorkItems.reduce(
    (sum, item) => sum + Number(item.realisasi ?? 0),
    0,
  );

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ingested Data</h2>
          <p className="mt-1 text-sm text-gray-500">
            Data berikut berasal dari hasil ingestion yang sudah tersimpan di database.
          </p>
        </div>

        {periods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => {
              const active = period.id === activePeriodId;

              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => {
                    setLoadingDetails(true);
                    setActivePeriodId(period.id);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-700"
                  }`}
                >
                  {period.period}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loadingPeriods ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Memuat data ingestion...
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : periods.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
          Belum ada period atau rincian ingestion yang tersimpan untuk project ini.
        </div>
      ) : (
        <div className="space-y-5 pt-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Period"
              value={activePeriod?.period ?? "—"}
              hint={activePeriod?.report_source ?? "Sumber laporan tidak tersedia"}
            />
            <StatCard
              label="Project Manager"
              value={activePeriod?.project_manager ?? "—"}
              hint={activePeriod?.client_name ?? "Client belum tersedia"}
            />
            <StatCard
              label="File Ingestion"
              value={activePeriod?.ingestion_file_id ? `#${activePeriod.ingestion_file_id}` : "—"}
              hint="Referensi file sumber"
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
            {TAB_ITEMS.map((tab) => {
              const active = tab.key === activeTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {loadingDetails && activeTab !== "curve" ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Memuat rincian period...
            </div>
          ) : null}

          {activeTab === "overview" && activePeriod && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Nilai Kontrak"
                  value={formatCurrency(activePeriod.contract_value)}
                />
                <StatCard
                  label="Addendum"
                  value={formatCurrency(activePeriod.addendum_value)}
                />
                <StatCard
                  label="Total Pagu"
                  value={formatCurrency(activePeriod.bq_external)}
                />
                <StatCard
                  label="Deviasi HPP"
                  value={formatCurrency(activePeriod.hpp_deviation)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Progress Sebelumnya"
                  value={formatPercent(activePeriod.progress_prev_pct)}
                />
                <StatCard
                  label="Progress Period Ini"
                  value={formatPercent(activePeriod.progress_this_pct)}
                />
                <StatCard
                  label="Progress Total"
                  value={formatPercent(activePeriod.progress_total_pct)}
                />
                <StatCard
                  label="Rows Tersimpan"
                  value={`${flattenedWorkItems.length + materials.length + equipment.length + progressCurves.length}`}
                  hint="Akumulasi work item, material, equipment, dan progress"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Total Work Item"
                  value={String(flattenedWorkItems.length)}
                  hint={`Budget ${formatCurrency(totalWorkBudget)} | Realisasi ${formatCurrency(totalWorkActual)}`}
                />
                <StatCard
                  label="Total Material"
                  value={String(materials.length)}
                  hint={`Tagihan ${formatCurrency(materialMeta?.total_tagihan ?? 0)}`}
                />
                <StatCard
                  label="Total Equipment"
                  value={String(equipment.length)}
                  hint={`Biaya ${formatCurrency(equipmentMeta?.total_biaya ?? 0)}`}
                />
              </div>
            </div>
          )}

          {activeTab === "work_items" && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-right">Realisasi</th>
                    <th className="px-4 py-3 text-right">Deviasi</th>
                    <th className="px-4 py-3 text-right">Deviasi %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {flattenedWorkItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        Belum ada work item yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    flattenedWorkItems.map((item) => (
                      <tr key={item.id} className={item.is_total_row ? "bg-blue-50/40" : ""}>
                        <td className="px-4 py-3 text-gray-500">{item.item_no ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-800">
                          <div
                            className={`truncate ${item.is_total_row ? "font-bold" : "font-medium"}`}
                            style={{ paddingLeft: `${item.depth * 16}px` }}
                            title={item.item_name}
                          >
                            {item.item_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.total_budget)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.realisasi)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.deviasi)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPercent(item.deviasi_pct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Total Rows"
                  value={String(materialMeta?.total_rows ?? materials.length)}
                />
                <StatCard
                  label="Total Tagihan"
                  value={formatCurrency(materialMeta?.total_tagihan ?? 0)}
                />
                <StatCard
                  label="Discount Rows"
                  value={String(materialMeta?.discount_rows ?? 0)}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                          Belum ada material log yang tersimpan.
                        </td>
                      </tr>
                    ) : (
                      materials.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-gray-700">{item.supplier_name ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-800">
                            <div className="font-medium">{item.material_type ?? "—"}</div>
                            {item.is_discount && (
                              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Discount
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatNumber(item.qty, 4)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.satuan ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.harga_satuan)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.total_tagihan)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "equipment" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Total Rows"
                  value={String(equipmentMeta?.total_rows ?? equipment.length)}
                />
                <StatCard
                  label="Total Biaya"
                  value={formatCurrency(equipmentMeta?.total_biaya ?? 0)}
                />
                <StatCard
                  label="Pending Payment"
                  value={String(equipmentMeta?.pending_count ?? 0)}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3 text-right">Jam Kerja</th>
                      <th className="px-4 py-3 text-right">Rate / Jam</th>
                      <th className="px-4 py-3 text-right">Total Biaya</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {equipment.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                          Belum ada equipment log yang tersimpan.
                        </td>
                      </tr>
                    ) : (
                      equipment.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-gray-700">{item.vendor_name ?? "—"}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {item.equipment_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatNumber(item.jam_kerja, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.rate_per_jam)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(item.total_biaya)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {item.payment_status ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "curve" && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Week</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Rencana</th>
                    <th className="px-4 py-3 text-right">Realisasi</th>
                    <th className="px-4 py-3 text-right">Deviasi</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {progressCurves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                        Belum ada data progress curve yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    progressCurves.map((curve) => (
                      <tr key={curve.id}>
                        <td className="px-4 py-3 text-gray-700">
                          {curve.week_number ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(curve.week_date)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPercent(curve.rencana_pct)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPercent(curve.realisasi_pct)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatPercent(curve.deviasi_pct)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {curve.keterangan ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

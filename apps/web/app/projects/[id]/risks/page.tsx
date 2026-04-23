"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/analytics/PageHeader";
import SCurveChart from "@/components/analytics/SCurveChart";
import { projectApi } from "@/lib/api";
import type { ProjectRisk, ProgressCurveResponse } from "@/types/project";
import { PencilSimple, Trash } from "@phosphor-icons/react";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-500",
  medium: "text-yellow-600",
  low: "text-green-600",
};

// ─── Autocomplete Input ───────────────────────────────────────────────────────
function AutocompleteInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = isTyping && value ? options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase())) : options;

  const handleFocus = () => {
    setIsTyping(false);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsTyping(true);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsTyping(false);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const item = listRef.current.children[index] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() =>
          setTimeout(() => {
            setIsOpen(false);
            setActiveIndex(-1);
          }, 200)
        }
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-[#1B1C1F] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
      />

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-[999] w-full mt-1 bg-white border border-[#E0E2E7] rounded-lg shadow-xl max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in duration-75"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-4 py-2 text-[14px] text-[#1B1C1F] cursor-pointer transition-colors font-medium capitalize ${
                  idx === activeIndex ? "bg-[#EBF0FF] text-[#21409A]" : "hover:bg-[#F2F4F7]"
                }`}
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-[12px] text-gray-400 italic">No matches found</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = ["cost", "schedule", "quality", "safety", "scope", "external"];
const STATUS_OPTIONS = ["open", "mitigated", "closed", "monitoring"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface RiskFormData {
  category: string;
  risk_title: string;
  financial_impact_idr: string;
  status: string;
}

const EMPTY_FORM: RiskFormData = {
  category: "",
  risk_title: "",
  financial_impact_idr: "",
  status: "open",
};

// ─── Risk Modal ───────────────────────────────────────────────────────────────
function RiskModal({
  mode,
  risk,
  projectId,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  risk?: ProjectRisk;
  projectId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<RiskFormData>(
    mode === "edit" && risk
      ? {
          category: risk.category ?? "",
          risk_title: risk.risk_title ?? "",
          financial_impact_idr: risk.financial_impact_idr ? String(risk.financial_impact_idr) : "",
          status: risk.status ?? "open",
        }
      : EMPTY_FORM,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.category.trim() || !form.risk_title.trim()) {
      setError("Kategori Risiko dan Deskripsi Kejadian wajib diisi.");
      return;
    }

    const payload = {
      category: form.category,
      risk_title: form.risk_title,
      financial_impact_idr: form.financial_impact_idr ? Number(form.financial_impact_idr) : null,
      status: form.status,
    };

    setLoading(true);
    setError(null);

    const request = mode === "create" ? projectApi.createRisk(projectId, payload) : projectApi.updateRisk(projectId, risk!.id, payload);

    request
      .then(() => {
        onSuccess();
        onClose();
      })
      .catch(() => setError("Terjadi kesalahan. Silakan coba lagi."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-bold text-[#1B1C1F]">{mode === "create" ? "Tambah Risiko" : "Edit Risiko"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Kategori Risiko */}
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Kategori Risiko <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              value={form.category}
              onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
              placeholder="Pilih atau ketik kategori..."
              options={CATEGORY_OPTIONS}
            />
          </div>

          {/* Deskripsi Kejadian */}
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Deskripsi Kejadian <span className="text-red-500">*</span>
            </label>
            <textarea
              name="risk_title"
              value={form.risk_title}
              onChange={handleChange}
              placeholder="Deskripsikan kejadian risiko..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-[#1B1C1F] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* Dampak (Rp / hari) */}
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dampak (Rp / hari)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400 font-medium">Rp</span>
              <input
                name="financial_impact_idr"
                type="number"
                value={form.financial_impact_idr}
                onChange={handleChange}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-[14px] text-[#1B1C1F] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <AutocompleteInput
              value={form.status}
              onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
              placeholder="Pilih atau ketik status..."
              options={STATUS_OPTIONS}
            />
          </div>

          {/* Error */}
          {error && <p className="text-[13px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 h-[38px] border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 h-[38px] bg-blue-600 text-white text-[13px] font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {mode === "create" ? "Simpan" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ risk, projectId, onClose, onSuccess }: { risk: ProjectRisk; projectId: number; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    setLoading(true);

    projectApi
      .deleteRisk(projectId, risk.id)
      .then(() => {
        onSuccess();
        onClose();
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-[20px]">🗑</span>
          </div>
          <h2 className="text-[16px] font-bold text-[#1B1C1F]">Hapus Risiko</h2>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus risiko <span className="font-semibold text-[#1B1C1F]">"{risk.risk_title}"</span>? Tindakan ini tidak
            dapat dibatalkan.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 h-[38px] border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-5 h-[38px] bg-red-500 text-white text-[13px] font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Level6Page() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [curve, setCurve] = useState<ProgressCurveResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editRisk, setEditRisk] = useState<ProjectRisk | null>(null);
  const [deleteRisk, setDeleteRisk] = useState<ProjectRisk | null>(null);

  const fetchData = () => {
    setLoading(true);

    Promise.all([projectApi.risks(projectId), projectApi.progressCurve(projectId)])
      .then(([riskRes, curveRes]) => {
        setRisks(riskRes.data);
        setCurve(curveRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );

  const spi = curve?.spi_value ?? 0;
  const spiColor = spi >= 1.0 ? "text-green-600" : spi >= 0.9 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white min-h-screen" style={{ padding: "24px 32px" }}>
      <PageHeader title="Level 6A Kamus Risiko (Historical Risk Register)" onExport={() => {}}>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-[13px] font-bold rounded-lg px-4 h-[38px] hover:bg-blue-700 transition-colors"
        >
          <span className="text-[16px] leading-none">+</span>
          Tambah Risiko
        </button>
      </PageHeader>

      <div className="overflow-hidden border border-gray-100 rounded-xl mb-10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-100">
              <th className="px-6 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Kategori Risiko</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Deskripsi Kejadian</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Dampak (Rp / hari)</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {risks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-[13px]">
                  No risk data available
                </td>
              </tr>
            ) : (
              risks.map((risk, idx) => (
                <tr key={risk.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-[14px] text-gray-600 font-medium">{idx + 1}</td>
                  <td className="px-4 py-4 text-[14px] font-semibold text-[#1B1C1F] capitalize">{risk.category ?? "-"}</td>
                  <td className="px-4 py-4 text-[14px] text-gray-700">{risk.risk_title}</td>
                  <td className="px-4 py-4 text-[14px] text-red-600 font-medium">
                    <div className="flex items-center gap-1">
                      <span>↑</span>
                      <span>{risk.financial_impact_idr ? `+Rp${Number(risk.financial_impact_idr).toLocaleString("id-ID")}` : "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FEF3C7] w-fit">
                      <div className="w-2 h-2 rounded-full bg-[#D97706]" />
                      <span className="text-[#D97706] text-[12px] font-bold capitalize">{risk.status ?? "open"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditRisk(risk)}
                        className="flex items-center justify-center w-[32px] h-[32px] bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Edit"
                      >
                        <PencilSimple size={18} weight="bold" />
                      </button>
                      <button
                        onClick={() => setDeleteRisk(risk)}
                        className="flex items-center justify-center w-[32px] h-[32px] bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="Hapus"
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">Level 6B Project Timeline</h2>

      {curve?.timeline ? (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Rencana</p>
            <p className="text-[14px] text-gray-600">{curve.timeline.planned ?? "Data tidak tersedia"}</p>
          </div>
          <div className="border border-gray-100 rounded-xl p-5">
            <p className="text-[13px] font-bold text-[#1B1C1F] mb-1">Data Aktual</p>
            <p className="text-[14px] text-gray-600">
              {curve.timeline.actual ?? "Data tidak tersedia"}
              {curve.timeline.delay_months > 0 && <span className="text-red-600 font-bold ml-1">({curve.timeline.delay_note})</span>}
            </p>
          </div>
        </div>
      ) : null}

      {curve?.sCurve && (
        <>
          <h3 className="text-[16px] font-bold text-[#1B1C1F] mb-4">Visualisasi</h3>
          <div className="mb-8">
            <SCurveChart months={curve.sCurve.months} plan={curve.sCurve.plan} actual={curve.sCurve.actual} />
          </div>
        </>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-primary-blue rounded-lg flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">SPI</span>
        </div>
        <span className="text-[14px] font-bold text-[#1B1C1F]">Schedule Performance Index</span>
      </div>

      <div className="border border-gray-100 rounded-xl p-6 mb-8 flex items-center gap-8">
        <p className={`text-[48px] font-bold ${spiColor}`}>{spi.toFixed(2)}</p>
        <div>
          <p className={`text-[16px] font-bold ${spiColor} mb-1`}>{curve?.spi_status}</p>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {`The SPI value of ${spi.toFixed(2)} indicates ${spi >= 1 ? "the project is ahead of or on schedule." : "the project is behind schedule."}`}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center justify-center border border-primary-blue text-primary-blue text-[13px] font-bold rounded-lg px-6 hover:bg-blue-50 transition-colors"
          style={{ height: "38px" }}
        >
          Finish Analysis
        </button>
      </div>

      {/* ── Modals ── */}
      {showCreate && <RiskModal mode="create" projectId={projectId} onClose={() => setShowCreate(false)} onSuccess={fetchData} />}

      {editRisk && <RiskModal mode="edit" risk={editRisk} projectId={projectId} onClose={() => setEditRisk(null)} onSuccess={fetchData} />}

      {deleteRisk && <DeleteModal risk={deleteRisk} projectId={projectId} onClose={() => setDeleteRisk(null)} onSuccess={fetchData} />}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { ingestionApi } from "@/lib/api";
import { STATUS_CONFIG } from "@/lib/constants/status";
import type { IngestionFile } from "@/types/project";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    day: "numeric",
    month: "long",
  });
}

interface Props {
  refreshTrigger?: number;
}

export default function IngestionHistory({ refreshTrigger = 0 }: Props) {
  const [files, setFiles] = useState<IngestionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const fetchFiles = () => {
    setLoading(true);
    ingestionApi
      .list(50)
      .then((res) => setFiles(res.data))
      .catch(() => setError("Failed to load upload history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  const handleReprocess = async (id: number) => {
    setReprocessingId(id);
    try {
      await ingestionApi.reprocess(id);
      fetchFiles();
    } catch {
      setError("Reprocess failed. Please try again.");
    } finally {
      setReprocessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white px-6 py-8 flex items-center justify-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-xl bg-white px-6 py-5">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="py-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-dark-gray">Project History</h1>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        {files.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No files uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {[
                    "#",
                    "File Name",
                    "Total Rows",
                    "Success",
                    "Failed",
                    "Status",
                    "Processed At",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-gray-400 first:px-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {files.map((file, index) => {
                  const statusCfg =
                    STATUS_CONFIG[file.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="text-gray-800 font-medium truncate max-w-xs block"
                          title={file.original_name}
                        >
                          {file.original_name}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {file.total_rows}
                      </td>
                      <td className="px-4 py-4 text-green-600 font-medium">
                        {file.imported_rows}
                      </td>
                      <td className="px-4 py-4 text-red-500 font-medium">
                        {file.skipped_rows}
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {statusCfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs">
                        {formatDate(file.processed_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={ingestionApi.downloadUrl(file.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                          >
                            Download
                          </a>
                          {(file.status === "failed" || file.status === "partial") && (
                            <button
                              onClick={() => handleReprocess(file.id)}
                              disabled={reprocessingId === file.id}
                              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors disabled:opacity-50"
                            >
                              <ArrowClockwiseIcon
                                size={12}
                                className={reprocessingId === file.id ? "animate-spin" : ""}
                              />
                              {reprocessingId === file.id ? "Processing..." : "Reprocess"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { projectApi } from "@/lib/api";
import type { UploadResponse, FileUploadResult } from "@/types/project";
import IngestionHistory from "@/components/upload/IngestionHistory";
import { MonitorArrowUp, Table, UploadSimple } from "@phosphor-icons/react";
import { STATUS_CONFIG } from "@/lib/constants/status";

type UploadState = "idle" | "dragging" | "uploading" | "done" | "error";

interface SelectedFile {
  file: File;
  id: string;
  validationError: string | null;
}

interface FileProgress {
  percent: number;
  status: "idle" | "uploading" | "done" | "error";
  result?: FileUploadResult;
}

function validateFile(file: File): string | null {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  const validType =
    allowed.includes(file.type) || /\.(xlsx|xls)$/i.test(file.name);
  if (!validType) return "Format must be .xlsx or .xls";
  if (file.size > 10 * 1024 * 1024) return "Maximum file size is 10MB";
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uniqueId(): string {
  return Math.random().toString(36).slice(2);
}

export default function UploadExcel() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null,
  );
  const [fileProgresses, setFileProgresses] = useState<
    Record<string, FileProgress>
  >({});
  const [globalError, setGlobalError] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDragging = uploadState === "dragging";
  const isUploading = uploadState === "uploading";
  const isDone = uploadState === "done";
  const validFiles = selectedFiles.filter((f) => !f.validationError);
  const invalidCount = selectedFiles.length - validFiles.length;

  function addFiles(newFiles: File[]) {
    const existingNames = new Set(selectedFiles.map((f) => f.file.name));
    const mapped = newFiles
      .filter((f) => !existingNames.has(f.name))
      .map((file) => ({
        file,
        id: uniqueId(),
        validationError: validateFile(file),
      }));

    setSelectedFiles((prev) => [...prev, ...mapped]);
    setUploadState("idle");
    setUploadResponse(null);
    setGlobalError("");
  }

  function removeFile(id: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleReset() {
    setSelectedFiles([]);
    setUploadResponse(null);
    setFileProgresses({});
    setGlobalError("");
    setUploadState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState("dragging");
  };
  const onDragLeave = () => {
    if (isDragging) setUploadState("idle");
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
    else setUploadState("idle");
  };
  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  };

  async function handleUpload() {
    if (!validFiles.length) return;

    setUploadState("uploading");
    setGlobalError("");
    setFileProgresses(
      Object.fromEntries(
        validFiles.map((sf) => [
          sf.id,
          { percent: 0, status: "idle" as const },
        ]),
      ),
    );

    const allResults: FileUploadResult[] = [];

    for (const sf of validFiles) {
      setFileProgresses((prev) => ({
        ...prev,
        [sf.id]: { percent: 0, status: "uploading" },
      }));

      try {
        const res = await projectApi.uploadSingle(sf.file, (percent) => {
          setFileProgresses((prev) => ({
            ...prev,
            [sf.id]: { ...prev[sf.id], percent },
          }));
        });

        const result = res.results?.[0];
        setFileProgresses((prev) => ({
          ...prev,
          [sf.id]: { percent: 100, status: "done", result },
        }));
        if (result) allResults.push(result);
      } catch (err: any) {
        const result = err?.responseData?.results?.[0];
        setFileProgresses((prev) => ({
          ...prev,
          [sf.id]: { percent: 100, status: "error", result },
        }));
        if (result) allResults.push(result);
      }
    }

    const anySuccess = allResults.some((r) =>
      ["success", "partial"].includes(r.status),
    );
    setUploadResponse({
      success: anySuccess,
      message: anySuccess ? "Upload complete." : "All files failed to import.",
      results: allResults,
    });
    setUploadState("done");
    setHistoryRefresh((n) => n + 1);
  }

  return (
    <div
      className="bg-white flex flex-col items-center"
      style={{
        width: "1139px",
        minHeight: "1024px",
        padding: "10px",
        margin: "16px",
        boxSizing: "border-box",
      }}
    >
      <div className="w-full max-w-6xl space-y-4">
        <header className="mb-2">
          <h1 className="text-lg font-bold text-dark-gray">Upload File</h1>
        </header>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl text-center transition-colors
            ${isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 bg-white"}
            ${selectedFiles.length > 0 ? "py-8 px-10" : "py-20 px-10"}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={onInputChange}
          />

          <div className="flex justify-center">
            <div className="w-12 h-12 flex items-center justify-center">
              <MonitorArrowUp />
            </div>
          </div>

          <p className="font-semibold text-dark-grey text-sm">
            {isDragging
              ? "Drop files here"
              : selectedFiles.length > 0
                ? "Click or drag to add more files"
                : "Click to upload or drag & drop files here"}
          </p>
          <p className="text-xs text-[#6E6F71] mt-1">
            Upload up to 20 files at once
          </p>
          <p className="text-xs mt-1 text-red-500 font-medium">
            Supported format: .xlsx only | Maximum file size: 10MB
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isUploading) inputRef.current?.click();
            }}
            className="mt-6 px-4 py-2 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            Browse Files
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden divide-y divide-gray-100">
            <div className="px-5 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {selectedFiles.length}{" "}
                {selectedFiles.length === 1 ? "file" : "files"} selected
                {invalidCount > 0 && (
                  <span className="ml-2 text-red-500 font-medium">
                    · {invalidCount} invalid
                  </span>
                )}
              </span>
              {!isUploading && !isDone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove all
                </button>
              )}
            </div>

            {selectedFiles.map((sf) => {
              const fp = fileProgresses[sf.id];
              const result = fp?.result;
              const hasResult = !!result;

              const statusCfg = hasResult
                ? STATUS_CONFIG[result.status]
                : sf.validationError
                  ? STATUS_CONFIG["failed"]
                  : fp?.status === "uploading"
                    ? STATUS_CONFIG["processing"]
                    : fp?.status === "done"
                      ? STATUS_CONFIG["success"]
                      : STATUS_CONFIG["pending"];

              return (
                <div key={sf.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <Table />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {sf.file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatSize(sf.file.size)} of 10 MB
                        {hasResult && (
                          <span className="ml-2">
                            · {result.imported} imported
                            {result.skipped > 0 &&
                              `, ${result.skipped} skipped`}
                          </span>
                        )}
                        {sf.validationError && (
                          <span className="ml-2 text-red-500">
                            {sf.validationError}
                          </span>
                        )}
                      </p>

                      {fp && !sf.validationError && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                fp.status === "error"
                                  ? "bg-red-400"
                                  : fp.status === "done"
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                              }`}
                              style={{ width: `${fp.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-gray-400 w-8 text-right">
                            {fp.percent}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      {fp?.status === "uploading" ? (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                        />
                      )}
                      {statusCfg.label}
                    </div>

                    {!isUploading && !isDone && (
                      <button
                        onClick={() => removeFile(sf.id)}
                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {hasResult && result.errors.length > 0 && (
                    <div className="mt-3 ml-11 space-y-1">
                      {result.errors.map((err, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-500"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {validFiles.length > 0 && !isUploading && !isDone && (
          <div className="flex gap-3 justify-end items-center mt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium border border-gray-600 rounded-lg text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 active:scale-95 transition-all shadow-sm"
            >
              <UploadSimple size={16} />
              <span>
                Upload {validFiles.length}{" "}
                {validFiles.length === 1 ? "File" : "Files"}
              </span>
            </button>
          </div>
        )}

        {isUploading && (
          <div className="border border-gray-100 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-800">
                Processing {validFiles.length}{" "}
                {validFiles.length === 1 ? "file" : "files"}...
              </span>
            </div>
            <p className="text-[11px] text-gray-400 italic mt-3">
              Do not close or refresh the page while uploading.
            </p>
          </div>
        )}

        {isDone && uploadResponse && (
          <div className="border border-gray-200 rounded-xl bg-white px-6 py-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${uploadResponse.success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
              >
                {uploadResponse.success ? (
                  <UploadSimple size={20} />
                ) : (
                  <MonitorArrowUp size={20} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {uploadResponse.success
                    ? "Upload Complete"
                    : "Upload Finished with Errors"}
                </h3>
                <p className="text-xs text-gray-500">
                  {uploadResponse.message}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">
                  {uploadResponse.results?.reduce(
                    (s, r) => s + r.imported,
                    0,
                  ) ?? 0}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tight">
                  Imported
                </p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-xl font-bold text-yellow-500">
                  {uploadResponse.results?.reduce((s, r) => s + r.skipped, 0) ??
                    0}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tight">
                  Skipped
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-700">
                  {uploadResponse.results?.length ?? 0}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tight">
                  Files
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleReset}
                className="px-5 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-black transition-all active:scale-95"
              >
                Upload More Files
              </button>
            </div>
          </div>
        )}

        {uploadState === "error" && globalError && (
          <div className="border border-gray-200 rounded-xl bg-white px-6 py-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg
                  className="w-3 h-3 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="font-semibold text-gray-800 text-sm">
                Upload failed
              </p>
            </div>
            <p className="text-sm text-gray-500">{globalError}</p>
            <button onClick={handleReset} className="btn-outline text-sm">
              Try Again
            </button>
          </div>
        )}

        <IngestionHistory refreshTrigger={historyRefresh} />
      </div>
    </div>
  );
}

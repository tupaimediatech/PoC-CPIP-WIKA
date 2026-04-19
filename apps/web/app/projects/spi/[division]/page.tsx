"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { projectApi } from "@/lib/api";

export default function SpiOverviewPage() {
  const params = useParams();
  const division = (params.division as string) || "infrastructure";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  useEffect(() => {
    setLoading(true);
    projectApi
      .getSpi(division)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [division]);

  const getStatus = (spiValue: string) => {
    const val = parseFloat(spiValue);
    if (val < 0.9) return { label: "Critical", dot: "bg-[#D92D20]", badge: "bg-[#FEE4E2] text-[#B42318]" };
    if (val < 1.0) return { label: "At Risk", dot: "bg-[#F79009]", badge: "bg-[#FFFAEB] text-[#B54708]" };
    return { label: "On Track", dot: "bg-[#12B76A]", badge: "bg-[#ECFDF3] text-[#027A48]" };
  };

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  const paginated = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const startItem = data.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading data...</div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[18px] font-semibold text-gray-900">Schedule Performance Index</h1>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-gray-500">
            Division : <span className="font-bold text-gray-900 capitalize">{division}</span>
          </span>
          <button className="flex items-center gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] transition-colors text-white text-[13px] font-semibold px-4 py-[9px] rounded-lg">
            Export Data
            {/* download arrow icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2v8m0 0L5 7m3 3 3-3M2 13h12" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* thead — light gray background */}
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-200">
                <th className="px-6 py-3 text-[12px] font-medium text-gray-500 whitespace-nowrap">Profit Center</th>
                <th className="px-6 py-3 text-[12px] font-medium text-gray-500 whitespace-nowrap">Project Name</th>
                <th className="px-6 py-3 text-[12px] font-medium text-gray-500 whitespace-nowrap">Division</th>
                <th className="px-6 py-3 text-[12px] font-medium text-gray-500 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 cursor-pointer select-none">
                    SPI
                    {/* up-down sort arrows */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6l3-3 3 3M4 8l3 3 3-3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-[12px] font-medium text-gray-500 whitespace-nowrap">Status</th>
              </tr>
            </thead>

            {/* tbody */}
            <tbody>
              {paginated.map((item, index) => {
                const status = getStatus(item.spi);
                return (
                  <tr
                    key={index}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === paginated.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="px-6 py-[14px] text-[14px] text-gray-500">{item.profit_center}</td>
                    <td className="px-6 py-[14px] text-[14px] text-gray-900 font-medium">{item.project_name}</td>
                    <td className="px-6 py-[14px] text-[14px] text-gray-500">{item.division}</td>
                    <td className="px-6 py-[14px] text-[14px] text-gray-900 font-semibold">{parseFloat(item.spi).toFixed(2)}</td>
                    <td className="px-6 py-[14px]">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${status.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer / Pagination — di luar card ── */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[14px] text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-700">
            {startItem} - {endItem}
          </span>{" "}
          of <span className="font-medium text-gray-700">{data.length}</span> results
        </p>

        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 4L4 8l4 4M12 4L8 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-semibold border transition-colors ${
                currentPage === page ? "bg-[#0EA5E9] text-white border-[#0EA5E9]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          ))}

          {/* Next */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Last page */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l4 4-4 4M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

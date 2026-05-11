"use client";

import { useMemo, useState } from "react";
import { CaretUpIcon, CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;

  actions?: (row: T, index: number) => React.ReactNode;

  footer?: {
    [key: string]: React.ReactNode;
  };
}

type SortOrder = "asc" | "desc";

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  actions,
  footer,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const filteredData = useMemo(() => {
    let result = [...data];

    /**
     * SEARCH
     */
    if (search.trim()) {
      result = result.filter((row) =>
        columns.some((col) => {
          if (!col.searchable) return false;

          const value = row[col.key];

          if (value === null || value === undefined) return false;

          return String(value).toLowerCase().includes(search.toLowerCase());
        }),
      );
    }

    /**
     * SORT
     */
    if (sortKey) {
      result.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        /**
         * HANDLE NULL
         */
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        /**
         * NUMBER
         */
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }

        /**
         * STRING
         */
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) {
          return sortOrder === "asc" ? -1 : 1;
        }

        if (aString > bString) {
          return sortOrder === "asc" ? 1 : -1;
        }

        return 0;
      });
    }

    return result;
  }, [columns, data, search, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-5">
      {/* SEARCH */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full
              h-11
              rounded-xl
              border
              border-gray-200
              bg-white
              pl-10
              pr-4
              text-sm
              outline-none
              transition-all
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-100
            "
          />
        </div>

        <div className="text-sm text-gray-500 whitespace-nowrap">Total: {filteredData.length}</div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* HEADER */}
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-200">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={`
                      px-5
                      py-4
                      text-left
                      text-[12px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-gray-500
                      ${col.headerClassName ?? ""}
                    `}
                  >
                    <button
                      type="button"
                      disabled={!col.sortable}
                      onClick={() => col.sortable && handleSort(String(col.key))}
                      className={`
                        inline-flex
                        items-center
                        gap-1
                        transition-opacity
                        ${col.sortable ? "hover:opacity-70" : "cursor-default"}
                      `}
                    >
                      {col.title}

                      {col.sortable && (
                        <>
                          {sortKey === col.key ? (
                            sortOrder === "asc" ? (
                              <CaretUpIcon size={14} />
                            ) : (
                              <CaretDownIcon size={14} />
                            )
                          ) : (
                            <div className="opacity-30">
                              <CaretUpIcon size={14} />
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  </th>
                ))}

                {actions && <th className="px-5 py-4 text-left text-[12px] font-bold uppercase tracking-wider text-gray-500">Action</th>}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={actions ? columns.length + 1 : columns.length} className="py-20">
                    <div className="flex items-center justify-center gap-3 text-gray-400">
                      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={actions ? columns.length + 1 : columns.length} className="py-20 text-center text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="
                      transition-colors
                      hover:bg-gray-50/70
                    "
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={`
                          px-5
                          py-4
                          text-[14px]
                          text-gray-700
                          ${col.className ?? ""}
                        `}
                      >
                        {col.render ? col.render(row[col.key], row, rowIndex) : String(row[col.key] ?? "-")}
                      </td>
                    ))}

                    {actions && <td className="px-5 py-4">{actions(row, rowIndex)}</td>}
                  </tr>
                ))
              )}
            </tbody>

            {/* FOOTER */}
            {footer && (
              <tfoot>
                <tr className="bg-[#F9FAFB] border-t border-gray-200">
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="
                        px-5
                        py-4
                        text-[14px]
                        font-bold
                        text-[#1B1C1F]
                      "
                    >
                      {footer[String(col.key)] ?? ""}
                    </td>
                  ))}

                  {actions && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

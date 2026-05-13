// lib/exporter.ts

import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface ExportOptions {
  filename?: string;
  quality?: number;
  backgroundColor?: string;
  padding?: number;
}

export async function exportElementToPdf(elementId: string, options: ExportOptions = {}) {
  const { filename = `Export_${Date.now()}`, quality = 3, backgroundColor = "#FFFFFF", padding = 12 } = options;

  const source = document.getElementById(elementId);

  if (!source) {
    throw new Error(`Element "${elementId}" not found`);
  }

  let exportContainer: HTMLDivElement | null = null;

  try {
    // =====================================
    // 1. CLONE ELEMENT
    // =====================================
    const clonedNode = source.cloneNode(true) as HTMLElement;

    // =====================================
    // 2. CREATE HIDDEN EXPORT AREA
    // =====================================
    exportContainer = document.createElement("div");
    exportContainer.style.position = "fixed";
    exportContainer.style.left = "-999999px";
    exportContainer.style.top = "0";
    exportContainer.style.zIndex = "-1";
    exportContainer.style.background = backgroundColor;
    exportContainer.style.padding = `${padding}px`;
    exportContainer.style.overflow = "visible";
    exportContainer.style.pointerEvents = "none";

    document.body.appendChild(exportContainer);
    exportContainer.appendChild(clonedNode);

    // =====================================
    // 3. FIX RENDERING & STYLING
    // =====================================
    const allElements = clonedNode.querySelectorAll<HTMLElement>("*");
    allElements.forEach((el) => {
      try {
        const computed = window.getComputedStyle(el);

        const invalid = (value: string) =>
          value?.includes("oklab(") || value?.includes("oklch(") || value?.includes("lab(") || value?.includes("lch(");

        if (invalid(computed.color)) el.style.color = "#000000";
        if (invalid(computed.backgroundColor)) el.style.backgroundColor = "#FFFFFF";
        if (invalid(computed.borderColor)) el.style.borderColor = "#D1D5DB";

        el.style.boxShadow = "none";
        el.style.textShadow = "none";
      } catch {}
    });

    // =====================================
    // 4. FIX TABLE & BARIS TERAKHIR (PENTING)
    // =====================================
    const scrollContainers = clonedNode.querySelectorAll<HTMLElement>("*");
    scrollContainers.forEach((el) => {
      const style = window.getComputedStyle(el);
      // Cek apakah elemen ini adalah kontainer yang bisa scroll
      if (style.overflow !== "visible" || style.overflowX !== "visible") {
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.maxHeight = "none"; // Hapus limit tinggi jika ada
        el.style.maxWidth = "none"; // Hapus limit lebar jika ada
      }
    });

    const tables = clonedNode.querySelectorAll<HTMLTableElement>("table");
    tables.forEach((table) => {
      table.style.marginBottom = "50px"; // Menghilangkan margin luar yang tidak perlu

      // Ambil baris terakhir dari tabel
      const rows = table.querySelectorAll("tr");
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const cells = lastRow.querySelectorAll("td, th");

        // Berikan padding bawah pada setiap cell di baris terakhir
        // agar teks tidak mepet ke border tabel
        cells.forEach((cell) => {
          (cell as HTMLElement).style.paddingBottom = "15px";
        });
      }
    });

    // Berikan padding bawah tambahan pada container utama kloning
    clonedNode.style.paddingBottom = "10px";

    // =====================================
    // 5. CALCULATE DIMENSIONS
    // =====================================
    let widestTable = 0;
    tables.forEach((table) => {
      widestTable = Math.max(widestTable, table.scrollWidth);
    });

    const finalWidth = Math.max(widestTable, clonedNode.scrollWidth, 1200);
    clonedNode.style.width = `${finalWidth}px`;
    clonedNode.style.minWidth = `${finalWidth}px`;

    // Tunggu render selesai agar kalkulasi scrollHeight akurat
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const width = Math.ceil(clonedNode.scrollWidth);
    // Tambahkan buffer 5px ekstra pada height untuk keamanan render
    const height = Math.ceil(clonedNode.scrollHeight) + 5;

    // =====================================
    // 6. EXPORT TO IMAGE
    // =====================================
    const dataUrl = await toPng(clonedNode, {
      cacheBust: true,
      pixelRatio: quality,
      backgroundColor,
      width: width,
      height: height,
    });

    // =====================================
    // 7. GENERATE PDF (DYNAMIC SIZE)
    // =====================================
    const pdf = new jsPDF({
      orientation: width > height ? "l" : "p",
      unit: "px",
      // Ukuran halaman = ukuran konten + padding sekeliling
      format: [width + padding * 2, height + padding * 2],
      compress: true,
    });

    pdf.addImage(dataUrl, "PNG", padding, padding, width, height, undefined, "FAST");

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  } finally {
    if (exportContainer) {
      document.body.removeChild(exportContainer);
    }
  }
}

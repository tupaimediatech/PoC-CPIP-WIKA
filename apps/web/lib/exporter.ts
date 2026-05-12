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
  const { filename = `Export_${Date.now()}`, quality = 3, backgroundColor = "#FFFFFF", padding = 8 } = options;

  const source = document.getElementById(elementId);

  if (!source) {
    throw new Error(`Element "${elementId}" not found`);
  }

  let exportContainer: HTMLDivElement | null = null;

  try {
    // =====================================
    // CLONE ELEMENT
    // =====================================

    const clonedNode = source.cloneNode(true) as HTMLElement;

    // =====================================
    // CREATE HIDDEN EXPORT AREA
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
    // FIX OKLAB / LAB
    // =====================================

    const allElements = clonedNode.querySelectorAll<HTMLElement>("*");

    allElements.forEach((el) => {
      try {
        const computed = window.getComputedStyle(el);

        const invalid = (value: string) =>
          value?.includes("oklab(") || value?.includes("oklch(") || value?.includes("lab(") || value?.includes("lch(");

        if (invalid(computed.color)) {
          el.style.color = "#000000";
        }

        if (invalid(computed.backgroundColor)) {
          el.style.backgroundColor = "#FFFFFF";
        }

        if (invalid(computed.borderColor)) {
          el.style.borderColor = "#D1D5DB";
        }

        el.style.boxShadow = "none";
        el.style.textShadow = "none";
      } catch {}
    });

    // =====================================
    // REMOVE STICKY
    // =====================================

    const stickyElements = clonedNode.querySelectorAll<HTMLElement>('[class*="sticky"]');

    stickyElements.forEach((el) => {
      el.style.position = "static";
      el.style.left = "auto";
      el.style.right = "auto";
      el.style.top = "auto";
      el.style.bottom = "auto";
      el.style.boxShadow = "none";
    });

    // =====================================
    // FIX OVERFLOW TABLE
    // =====================================

    const overflowWrappers = clonedNode.querySelectorAll<HTMLElement>(".overflow-x-auto, .overflow-auto");

    overflowWrappers.forEach((wrapper) => {
      wrapper.style.overflow = "visible";
      wrapper.style.maxWidth = "none";
      wrapper.style.width = "100%";
    });

    // =====================================
    // GET TRUE TABLE WIDTH
    // =====================================

    let widestTable = 0;

    const tables = clonedNode.querySelectorAll<HTMLTableElement>("table");

    tables.forEach((table) => {
      widestTable = Math.max(widestTable, table.scrollWidth);
    });

    // =====================================
    // EXPAND WHOLE LAYOUT
    // AGAR SECTION IKUT SELARAS
    // =====================================

    const finalWidth = Math.max(widestTable, clonedNode.scrollWidth, 1400);

    clonedNode.style.width = `${finalWidth}px`;
    clonedNode.style.minWidth = `${finalWidth}px`;
    clonedNode.style.maxWidth = "none";
    clonedNode.style.overflow = "visible";

    // Semua direct section ikut melebar
    const sections = clonedNode.querySelectorAll<HTMLElement>(":scope > *");

    sections.forEach((section) => {
      section.style.width = "100%";
      section.style.maxWidth = "100%";
    });

    // =====================================
    // FIX TABLE
    // =====================================

    tables.forEach((table) => {
      table.style.width = "100%";
      table.style.minWidth = `${widestTable}px`;
      table.style.tableLayout = "auto";
      table.style.borderCollapse = "collapse";
    });

    // =====================================
    // WAIT REFLOW
    // =====================================

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // =====================================
    // FINAL SIZE
    // =====================================

    const width = Math.ceil(clonedNode.scrollWidth);

    const height = Math.ceil(clonedNode.scrollHeight);

    // =====================================
    // EXPORT PNG
    // =====================================

    const dataUrl = await toPng(clonedNode, {
      cacheBust: true,

      pixelRatio: Math.max(quality, 3),

      backgroundColor,

      width,

      height,

      canvasWidth: width,

      canvasHeight: height,

      style: {
        margin: "0",
        padding: "0",
        background: backgroundColor,
      },
    });

    // =====================================
    // PDF
    // =====================================

    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",

      unit: "px",

      format: "a4",

      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();

    const pageHeight = pdf.internal.pageSize.getHeight();

    // padding kecil agar tidak banyak gap kosong
    const safePadding = 6;

    const usableWidth = pageWidth - safePadding * 2;

    const scaledHeight = (height * usableWidth) / width;

    let remainingHeight = scaledHeight;

    let currentPosition = 0;

    // PAGE 1
    pdf.addImage(dataUrl, "PNG", safePadding, currentPosition + safePadding, usableWidth, scaledHeight, undefined, "FAST");

    remainingHeight -= pageHeight;

    // NEXT PAGES
    while (remainingHeight > 0) {
      currentPosition = remainingHeight - scaledHeight;

      pdf.addPage();

      pdf.addImage(dataUrl, "PNG", safePadding, currentPosition + safePadding, usableWidth, scaledHeight, undefined, "FAST");

      remainingHeight -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  } finally {
    // =====================================
    // REMOVE CLONE
    // =====================================

    if (exportContainer) {
      document.body.removeChild(exportContainer);
    }
  }
}

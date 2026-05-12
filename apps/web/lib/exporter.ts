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
  const { filename = `Export_${Date.now()}`, quality = 2, backgroundColor = "#FFFFFF", padding = 24 } = options;

  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element "${elementId}" not found`);
  }

  try {
    // simpan style asli
    const originalOverflow = document.body.style.overflow;

    // pastikan seluruh halaman terlihat
    document.body.style.overflow = "visible";

    // tunggu render settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rect = element.getBoundingClientRect();

    const width = rect.width;
    const height = element.scrollHeight;

    const dataUrl = await toPng(element, {
      cacheBust: true,

      pixelRatio: quality,

      backgroundColor,

      width,

      height,

      style: {
        padding: `${padding}px`,
        background: backgroundColor,
      },
    });

    const pdfWidth = width + padding * 2;
    const pdfHeight = height + padding * 2;

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",

      unit: "px",

      format: [pdfWidth, pdfHeight],

      compress: true,
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);

    pdf.save(`${filename}.pdf`);

    document.body.style.overflow = originalOverflow;

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}

// lib/exporter.ts

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ExportOptions {
  filename?: string;
  backgroundColor?: string;
  quality?: number;
  padding?: number;
}

function sanitizeUnsupportedColors(root: HTMLElement | Document) {
  const elements = root.querySelectorAll<HTMLElement>("*");

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);

    const properties = [
      "color",
      "backgroundColor",
      "borderColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "textDecorationColor",
      "boxShadow",
    ];

    properties.forEach((prop) => {
      const value = computed[prop as any];

      if (typeof value === "string" && (value.includes("lab(") || value.includes("oklab(") || value.includes("lch(") || value.includes("oklch("))) {
        switch (prop) {
          case "backgroundColor":
            el.style.backgroundColor = "#ffffff";
            break;

          case "color":
            el.style.color = "#000000";
            break;

          case "borderColor":
          case "borderTopColor":
          case "borderRightColor":
          case "borderBottomColor":
          case "borderLeftColor":
            el.style.borderColor = "#d1d5db";
            break;

          case "outlineColor":
            el.style.outlineColor = "#d1d5db";
            break;

          case "textDecorationColor":
            el.style.textDecorationColor = "#000000";
            break;

          case "boxShadow":
            el.style.boxShadow = "none";
            break;
        }
      }
    });
  });
}

export async function exportElementToPdf(elementId: string, options: ExportOptions = {}) {
  const { filename = `Export_${Date.now()}`, backgroundColor = "#FFFFFF", quality = 2, padding = 24 } = options;

  const source = document.getElementById(elementId);

  if (!source) {
    console.error(`Element with id "${elementId}" not found.`);
    return false;
  }

  const originalStyle = source.style.cssText;

  try {
    // gunakan ukuran asli element
    const rect = source.getBoundingClientRect();

    const contentWidth = rect.width;
    const contentHeight = source.scrollHeight;

    // total size + padding
    const exportWidth = contentWidth + padding * 2;
    const exportHeight = contentHeight + padding * 2;

    const canvas = await html2canvas(source, {
      scale: quality,

      useCORS: true,

      allowTaint: false,

      logging: false,

      backgroundColor,

      foreignObjectRendering: false,

      removeContainer: true,

      width: contentWidth,

      height: contentHeight,

      windowWidth: document.documentElement.clientWidth,

      windowHeight: document.documentElement.clientHeight,

      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);

        if (clonedElement) {
          sanitizeUnsupportedColors(clonedDoc);

          clonedElement.style.width = `${contentWidth}px`;

          clonedElement.style.minWidth = `${contentWidth}px`;

          clonedElement.style.maxWidth = `${contentWidth}px`;

          clonedElement.style.overflow = "visible";

          clonedElement.style.height = "auto";

          clonedElement.style.transform = "none";

          // FIX chart responsive stretch
          const charts = clonedElement.querySelectorAll("canvas");

          charts.forEach((chart) => {
            const parent = chart.parentElement;

            if (parent) {
              parent.style.width = "100%";
              parent.style.maxWidth = "100%";
            }

            chart.style.maxWidth = "100%";
            chart.style.width = "100%";
            chart.style.height = "auto";
          });
        }
      },
    });

    // canvas baru dengan padding
    const finalCanvas = document.createElement("canvas");

    finalCanvas.width = exportWidth * quality;
    finalCanvas.height = exportHeight * quality;

    const ctx = finalCanvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }

    // background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // gambar utama dengan padding
    ctx.drawImage(canvas, padding * quality, padding * quality);

    const imgData = finalCanvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({
      orientation: exportWidth > exportHeight ? "landscape" : "portrait",

      unit: "px",

      format: [exportWidth, exportHeight],

      hotfixes: ["px_scaling"],

      compress: true,
    });

    pdf.addImage(imgData, "JPEG", 0, 0, exportWidth, exportHeight, undefined, "FAST");

    pdf.save(`${filename}.pdf`);

    return true;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  } finally {
    source.style.cssText = originalStyle;
  }
}

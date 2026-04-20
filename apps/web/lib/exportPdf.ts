// lib/exportPdf.ts
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportDashboardToPdf(elementId = "dashboard-export-root") {
  const source = document.getElementById(elementId);
  if (!source) return;

  // 1. Simpan original style untuk dikembalikan nanti
  const originalStyle = source.style.cssText;
  const originalWidth = source.offsetWidth;

  // 2. FORCE WIDTH agar tidak offside saat diproses html2canvas
  // Kita kunci lebarnya sesuai tampilan di layar agar layout tidak berantakan
  source.style.width = `${originalWidth}px`;
  source.style.minWidth = `${originalWidth}px`;
  source.style.maxWidth = `${originalWidth}px`;
  source.style.position = "relative"; // Memastikan koordinat anak elemen benar

  try {
    // 3. Render dengan optimasi font dan skala
    const canvas = await html2canvas(source, {
      scale: 3, // Naikkan ke 3 untuk ketajaman teks maksimal
      useCORS: true,
      logging: false,
      backgroundColor: "#FCF9F1", // Warna cream sesuai desain UI kamu
      allowTaint: true,
      // Penting: windowWidth memastikan media queries yang terbaca adalah versi desktop
      windowWidth: 1440,
      onclone: (clonedDoc) => {
        // Pastikan elemen di dalam clone tidak memiliki scrollbar yang mengganggu
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.overflow = "visible";
        }
      },
    });

    const imgData = canvas.toDataURL("image/png");

    // 4. Hitung dimensi PDF dalam Landscape
    // Menggunakan rasio agar pas di satu halaman
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width / 3, canvas.height / 3], // Kembali ke ukuran asli (skala 1)
      hotfixes: ["px_scaling"],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3, undefined, "FAST");

    pdf.save(`Dashboard_Export_${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error("PDF Export failed:", error);
  } finally {
    // 5. KEMBALIKAN STYLE ASLI agar dashboard di web tidak rusak setelah export
    source.style.cssText = originalStyle;
  }
}

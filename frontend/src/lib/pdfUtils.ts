import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export async function downloadPDF(
  elementId: string,
  filename = 'chart.pdf',
  addHeader = true,
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) { alert(`Element #${elementId} not found`); return; }

  try {
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, allowTaint: false, logging: false,
      backgroundColor: '#07090f',
      windowWidth: Math.max(el.scrollWidth, 1200),
    });
    const img  = canvas.toDataURL('image/png');
    const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw   = pdf.internal.pageSize.getWidth();
    const ph   = pdf.internal.pageSize.getHeight();
    const iw   = canvas.width;
    const ih   = canvas.height;
    const ratio = iw / ih;
    const width = pw - 20;
    const height = width / ratio;
    const yOffset = addHeader ? 20 : 10;

    if (addHeader) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✦ HOLO AstroCRM', pw / 2, 12, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date().toLocaleString(), pw / 2, 17, { align: 'center' });
    }

    let y = yOffset;
    let remaining = height;
    while (remaining > 0) {
      const pageHeight = ph - y - 10;
      const chunk = Math.min(remaining, pageHeight);
      const srcY  = (height - remaining) * (canvas.height / height);
      const srcH  = chunk * (canvas.height / height);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width  = canvas.width;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 10, y, width, chunk);
      remaining -= chunk;
      if (remaining > 0) { pdf.addPage(); y = 10; }
    }

    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed', err);
    alert(`PDF export failed: ${(err as Error)?.message || 'Unknown error'}`);
  }
}

/**
 * Exports multiple named sections into a single multi-page PDF.
 * For each section, calls `switchSection(id)` so the caller can
 * activate the right tab/panel before the capture runs.
 */
export async function downloadTabsPDF(
  sections: Array<{ id: string; title: string }>,
  switchSection: (id: string) => Promise<void>,
  filename = 'full-report.pdf',
): Promise<void> {
  const BG = '#07090f';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = pdf.internal.pageSize.getWidth();
  const ph  = pdf.internal.pageSize.getHeight();
  let isFirst = true;

  try {
    for (const { id, title } of sections) {
      await switchSection(id);

      const el = document.getElementById(id);
      if (!el) continue;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: BG,
        windowWidth: Math.max(el.scrollWidth, 1200),
      });
      if (canvas.width === 0 || canvas.height === 0) continue;

      if (!isFirst) pdf.addPage();
      isFirst = false;

      // section header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(214, 168, 93);
      pdf.text(`HOLO · ${title}`, pw / 2, 8, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      const pageW   = pw - 20;
      const imgH    = (pageW * canvas.height) / canvas.width;
      let remaining = imgH;
      let y         = 14;

      while (remaining > 0) {
        const avail = ph - y - 5;
        const chunk = Math.min(remaining, avail);
        const srcY  = Math.round((imgH - remaining) * (canvas.height / imgH));
        const srcH  = Math.round(chunk * (canvas.height / imgH));

        const slice = document.createElement('canvas');
        slice.width  = canvas.width;
        slice.height = Math.max(srcH, 1);
        const ctx = slice.getContext('2d')!;
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', 10, y, pageW, chunk);
        remaining -= chunk;
        if (remaining > 0) { pdf.addPage(); y = 10; }
      }
    }

    if (!isFirst) pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed', err);
    alert(`PDF export failed: ${(err as Error)?.message || 'Unknown error'}`);
  }
}

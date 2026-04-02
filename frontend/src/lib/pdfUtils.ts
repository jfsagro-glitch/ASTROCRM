import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

async function waitForRenderable(el: HTMLElement, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  let stableTicks = 0;
  let lastHeight = 0;

  while (Date.now() - start < timeoutMs) {
    const rect = el.getBoundingClientRect();
    const hasSize = rect.width > 0 && rect.height > 0;
    const hasSpinner = !!el.querySelector('.animate-spin');
    const height = Math.round(rect.height);

    if (hasSize && !hasSpinner && Math.abs(height - lastHeight) <= 1) {
      stableTicks += 1;
      if (stableTicks >= 3) return;
    } else {
      stableTicks = 0;
    }

    lastHeight = height;
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  }
}

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
  const BG = '#ffffff';
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw  = pdf.internal.pageSize.getWidth();
  const ph  = pdf.internal.pageSize.getHeight();
  let isFirst = true;

  try {
    for (const { id, title } of sections) {
      await switchSection(id);

      const el = document.getElementById(id);
      if (!el) continue;
      await waitForRenderable(el as HTMLElement);

      const captureWidth = Math.max(1180, Math.min(1400, el.scrollWidth || el.clientWidth || 1180));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: BG,
        windowWidth: captureWidth,
        scrollY: -window.scrollY,
        onclone: (doc) => {
          doc.body.classList.add('pdf-export-bw');
          const target = doc.getElementById(id);
          if (target) {
            target.style.maxWidth = 'none';
            target.style.width = `${captureWidth}px`;
            target.style.padding = '20px';
            target.style.margin = '0';
            target.style.filter = 'grayscale(1)';
          }
        },
      });
      if (canvas.width === 0 || canvas.height === 0) continue;

      if (!isFirst) pdf.addPage();
      isFirst = false;

      // section header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`HOLO AstroCRM | ${title}`, pw / 2, 8, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      const pageW   = pw - 12;
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

        pdf.addImage(slice.toDataURL('image/jpeg', 0.98), 'JPEG', 6, y, pageW, chunk);
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

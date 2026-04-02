import html2canvas from 'html2canvas';
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
      scale: 2, useCORS: true, allowTaint: true, logging: false,
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
    alert('PDF export failed. See console for details.');
  }
}

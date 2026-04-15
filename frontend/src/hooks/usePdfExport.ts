/**
 * usePdfExport — hook for exporting the current ClientPortal view as PDF.
 * Uses html2pdf.js for client-side rendering.
 * Falls back to backend /report/generate + browser print if html2pdf unavailable.
 */
import { useState, useCallback } from 'react';
import type { BirthInput } from '../types/astro';
import { generateReportHtml } from '../services/astrologyService';

type Depth = 'brief' | 'full' | 'professional';

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * exportCurrentView — snapshot the #pdf-root DOM node to PDF.
   * Requires the component to wrap its content in <div id="pdf-root">.
   */
  const exportCurrentView = useCallback(async (filename = 'astrocrm-chart.pdf') => {
    setExporting(true);
    setExportError(null);
    try {
      const root = document.getElementById('pdf-root') as HTMLElement | null;
      if (!root) throw new Error('pdf-root not found');

      // Dynamic import to keep bundle lean
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0a0a1a' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(root).save();
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  }, []);

  /**
   * exportFullReport — call backend /report/generate (HTML), open in new tab, trigger browser print.
   * This produces a clean printable report regardless of the current UI state.
   */
  const exportFullReport = useCallback(async (
    birth: BirthInput,
    name: string,
    depth: Depth = 'full',
  ) => {
    setExporting(true);
    setExportError(null);
    try {
      const html = await generateReportHtml(birth, name, depth);
      const blob  = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url   = URL.createObjectURL(blob);
      const win   = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          setTimeout(() => win.print(), 500);
        });
      }
      // Revoke after delay to allow print dialog
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Ошибка генерации отчёта');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportError, exportCurrentView, exportFullReport };
}

// ─── PwaInstallBanner — unobtrusive install CTA, iOS-aware ───────────────────
import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

export default function PwaInstallBanner() {
  const { canInstall, install, dismiss, needsIosInstructions } = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (needsIosInstructions) { setShowIosHelp(true); return; }
    const result = await install();
    if (result === 'dismissed') dismiss();
  };

  return (
    <div
      role="region"
      aria-label="Установка приложения"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:w-[360px] z-40 card-lift"
    >
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Download size={16} className="text-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white m-0">Установить HOLO</h3>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Быстрый доступ, push-уведомления о транзитах, работа офлайн.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleClick}
                className="px-3 py-2 min-h-[40px] rounded-xl bg-amber-400 text-slate-900 text-xs font-semibold hover:bg-amber-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                Установить
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-2 min-h-[40px] rounded-xl text-white/70 text-xs hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Позже
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Закрыть"
            className="text-white/40 hover:text-white/80 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {showIosHelp && (
          <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-white/80 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1 text-amber-300 font-semibold">
              <Share size={12} aria-hidden="true" /> Установка на iPhone
            </div>
            Нажмите <strong>Поделиться</strong> в Safari → <strong>«На экран Домой»</strong> → <strong>«Добавить»</strong>.
          </div>
        )}
      </div>
    </div>
  );
}

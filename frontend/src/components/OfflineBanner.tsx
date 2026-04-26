// ─── OfflineBanner — sticky strip when navigator.onLine === false ────────────
import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-[60] flex justify-center pointer-events-none"
    >
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 backdrop-blur text-amber-100 text-xs">
        <WifiOff size={12} aria-hidden="true" />
        Без сети — показываются последние данные
      </div>
    </div>
  );
}

// ─── DayCardShare — generates a 1080×1080 PNG card of today's energy ──────────
// Native Canvas drawing — no html2canvas/dom-to-image dependency.
// Uses Web Share API where available, falls back to PNG download.
import { useEffect, useRef, useState } from 'react';
import { Share2, Download, X, Check } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props {
  data: DashboardData;
  theme: ThemeLike;
}

const PLANET_GL: Record<string, string> = {
  sun: '☉', moon: '☾', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон',
};
const ASPECT_SYM: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□',
  sextile: '⚹', quincunx: '⚻',
};
const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

function dayLabel(score: number): string {
  if (score >= 75) return 'Сильный день';
  if (score >= 60) return 'Хороший день';
  if (score >= 45) return 'Нейтральный день';
  if (score >= 30) return 'Сложный день';
  return 'Тихий день';
}

function scoreColor(score: number): string {
  if (score >= 65) return '#22c55e';
  if (score <= 40) return '#ef4444';
  return '#f59e0b';
}

function drawCard(canvas: HTMLCanvasElement, data: DashboardData) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;

  // Background — radial gradient based on score
  const score = data.day_score ?? 50;
  const accent = scoreColor(score);

  const bg = ctx.createRadialGradient(W / 2, H / 3, 100, W / 2, H / 2, 900);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.5, '#0f0a2e');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow at top
  const glow = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 600);
  glow.addColorStop(0, accent + '33');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 80; i++) {
    const x = (i * 137.5) % W;
    const y = (i * 71.3 + i * i * 0.1) % H;
    const r = (i % 4 === 0) ? 1.6 : 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Date strip — top
  const today = new Date();
  const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
  ctx.font = '500 32px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'center';
  ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), W / 2, 110);

  // Score ring (centered)
  const cx = W / 2;
  const cy = 380;
  const ringR = 170;
  // Background ring
  ctx.lineWidth = 18;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  // Progress ring
  ctx.strokeStyle = accent;
  ctx.lineCap = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score) / 100);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Score number
  ctx.fillStyle = accent;
  ctx.font = '700 130px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), cx, cy - 8);
  ctx.font = '600 28px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = accent + 'cc';
  ctx.fillText('из 100', cx, cy + 78);
  ctx.textBaseline = 'alphabetic';

  // Day label
  ctx.font = '700 56px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(dayLabel(score), cx, 640);

  // Moon line
  const moonSign = SIGN_RU[data.moon.sign] ?? data.moon.sign;
  ctx.font = '500 32px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`☾ Луна в ${moonSign}${data.moon.is_void ? ' · без курса' : ''}`, cx, 695);

  // Top transit
  const topT = (data.top_transits ?? [])[0] as Record<string, unknown> | undefined;
  if (topT) {
    const tp = String(topT.transit_planet ?? '');
    const np = String(topT.natal_planet ?? '');
    const asp = String(topT.aspect ?? '');
    const text = `${PLANET_GL[tp] ?? ''} ${PLANET_RU[tp] ?? tp} ${ASPECT_SYM[asp] ?? ''} ${PLANET_GL[np] ?? ''} ${PLANET_RU[np] ?? np}`;
    ctx.font = '500 30px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Главный транзит', cx, 770);
    ctx.font = '600 36px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, 815);
  }

  // Sphere bars (5 spheres)
  const spheres = data.sphere_scores;
  if (spheres) {
    const labels: Array<[keyof typeof spheres, string, string]> = [
      ['love', 'Любовь', '#f472b6'],
      ['work', 'Работа', '#60a5fa'],
      ['finance', 'Финансы', '#34d399'],
      ['health', 'Здоровье', '#5eead4'],
      ['creative', 'Творчество', '#c084fc'],
    ];
    const barY0 = 880;
    const barW = 800;
    const barX = (W - barW) / 2;
    const colW = barW / 5;
    labels.forEach(([key, label, color], i) => {
      const v = spheres[key];
      const x = barX + i * colW + colW / 2;
      // Track
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const trackH = 80;
      const bx = x - 18;
      ctx.fillRect(bx, barY0, 36, trackH);
      // Filled portion
      const fillH = (v / 100) * trackH;
      ctx.fillStyle = color;
      ctx.fillRect(bx, barY0 + (trackH - fillH), 36, fillH);
      // Number
      ctx.font = '700 24px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(String(v), x, barY0 - 10);
      // Label
      ctx.font = '500 20px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(label, x, barY0 + trackH + 28);
    });
  }

  // Footer / watermark
  ctx.font = '600 22px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'center';
  ctx.fillText('✦ Astro Daily', cx, 1040);
}

export default function DayCardShare({ data, theme }: Props) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      drawCard(canvasRef.current, data);
    }
  }, [open, data]);

  const dataUrl = () => canvasRef.current?.toDataURL('image/png') ?? '';

  const downloadPng = () => {
    const url = dataUrl();
    if (!url) return;
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astro-day-${today}.png`;
    a.click();
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  };

  const shareNative = async () => {
    if (!canvasRef.current) return;
    setShareError(null);
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Не удалось создать изображение');
      const today = new Date().toISOString().slice(0, 10);
      const file = new File([blob], `astro-day-${today}.png`, { type: 'image/png' });
      const navAny = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean; share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void> };
      if (navAny.canShare && navAny.canShare({ files: [file] }) && navAny.share) {
        await navAny.share({
          files: [file],
          title: 'Энергия дня',
          text: `Мой день: ${data.day_score ?? '—'}/100 ✦`,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      } else {
        // Fallback to download
        downloadPng();
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user cancelled
      setShareError((e as Error).message ?? 'Ошибка');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 min-h-[40px] rounded-xl ${theme.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
        aria-label="Поделиться карточкой дня"
      >
        <Share2 size={12} aria-hidden="true" />
        Поделиться днём
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Поделиться карточкой дня"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="absolute top-2 right-2 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-semibold text-white mb-1">Карточка дня</h3>
            <p className="text-xs text-white/60 mb-3">PNG 1080×1080 — для Instagram, Telegram, любой ленты.</p>

            <canvas
              ref={canvasRef}
              className="w-full rounded-xl border border-white/10 bg-slate-950"
              style={{ aspectRatio: '1 / 1' }}
              aria-label="Превью карточки"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={shareNative}
                className="flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 min-h-[44px] rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Share2 size={14} aria-hidden="true" />
                Поделиться
              </button>
              <button
                type="button"
                onClick={downloadPng}
                className={`flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 min-h-[44px] rounded-xl ${theme.btn} font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
              >
                <Download size={14} aria-hidden="true" />
                Скачать PNG
              </button>
            </div>

            {shared && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300" role="status">
                <Check size={14} aria-hidden="true" /> Готово
              </div>
            )}
            {shareError && (
              <div className="mt-3 text-xs text-rose-300" role="alert">
                {shareError}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

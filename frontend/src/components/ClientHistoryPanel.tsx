/**
 * ClientHistoryPanel — consultation notes timeline for a saved person.
 *
 * Shows past sessions, transit notes, readings. Allows adding new entries
 * with type, date, status, price, and free-text notes.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  ConsultationNote,
  NoteType,
  NoteStatus,
  PaymentStatus,
  subscribeNotes,
  addNote,
  updateNote,
  deleteNote,
} from '../services/consultationService';
import type { SavedPerson } from '../services/peopleService';

// ── helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<NoteType, string> = {
  note: '📝 Заметка',
  consultation: '🔮 Консультация',
  reading: '📖 Ридинг',
  transit_session: '⚡ Транзит-сессия',
};

const STATUS_LABELS: Record<NoteStatus, string> = {
  scheduled: '⏳ Запланировано',
  completed: '✅ Завершено',
  cancelled: '❌ Отменено',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: '💳 Ожидает',
  paid: '✔️ Оплачено',
  refunded: '↩️ Возврат',
};

const TYPE_COLORS: Record<NoteType, string> = {
  note: 'border-blue-500/40 bg-blue-500/5',
  consultation: 'border-purple-500/40 bg-purple-500/5',
  reading: 'border-amber-500/40 bg-amber-500/5',
  transit_session: 'border-cyan-500/40 bg-cyan-500/5',
};

function tsToDate(ts: Timestamp | string | undefined): string {
  if (!ts) return '';
  if (typeof ts === 'string') return ts.slice(0, 10);
  try { return ts.toDate().toISOString().slice(0, 10); } catch { return ''; }
}

function tsToDisplay(ts: Timestamp | undefined): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}

// ── sub-components ──────────────────────────────────────────────────────────

interface NoteCardProps {
  note: ConsultationNote;
  onStatusChange: (id: string, status: NoteStatus) => void;
  onPaymentChange: (id: string, p: PaymentStatus) => void;
  onDelete: (id: string) => void;
}

function NoteCard({ note, onStatusChange, onPaymentChange, onDelete }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isConsult = note.type !== 'note';

  return (
    <div
      className={`rounded-lg border p-3 text-sm transition-all ${TYPE_COLORS[note.type]}`}
      style={{ borderWidth: 1 }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs opacity-60">{TYPE_LABELS[note.type]}</span>
            {note.status && (
              <span className="text-xs opacity-60">{STATUS_LABELS[note.status]}</span>
            )}
            {note.paymentStatus && (
              <span className="text-xs opacity-60">{PAYMENT_LABELS[note.paymentStatus]}</span>
            )}
            {note.price != null && (
              <span className="text-xs font-medium text-green-400">{note.price} ₽</span>
            )}
          </div>
          <div className="font-medium mt-0.5 text-white/90">{note.title}</div>
          <div className="text-xs text-white/50 mt-0.5">{tsToDisplay(note.date)}</div>
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className="p-1 text-white/30 hover:text-red-400 rounded transition-colors"
          title="Удалить"
          aria-label="Удалить запись"
        >
          ✕
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
          {note.notes && (
            <p className="text-white/70 whitespace-pre-wrap text-xs leading-relaxed">
              {note.notes}
            </p>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map(t => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {isConsult && (
            <div className="flex flex-wrap gap-2 mt-1">
              {/* Status selector */}
              <select
                value={note.status ?? ''}
                onChange={e => onStatusChange(note.id, e.target.value as NoteStatus)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70"
                aria-label="Статус"
              >
                <option value="">— статус —</option>
                {(Object.keys(STATUS_LABELS) as NoteStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {/* Payment selector */}
              <select
                value={note.paymentStatus ?? ''}
                onChange={e => onPaymentChange(note.id, e.target.value as PaymentStatus)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70"
                aria-label="Оплата"
              >
                <option value="">— оплата —</option>
                {(Object.keys(PAYMENT_LABELS) as PaymentStatus[]).map(s => (
                  <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── blank form state ────────────────────────────────────────────────────────

interface FormState {
  type: NoteType;
  title: string;
  date: string;
  notes: string;
  tags: string;
  status: NoteStatus | '';
  price: string;
  paymentStatus: PaymentStatus | '';
}

const BLANK: FormState = {
  type: 'consultation',
  title: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  tags: '',
  status: 'scheduled',
  price: '',
  paymentStatus: 'pending',
};

// ── main component ──────────────────────────────────────────────────────────

interface Props {
  uid: string;
  person: SavedPerson | null;
}

export function ClientHistoryPanel({ uid, person }: Props) {
  const [notes, setNotes] = useState<ConsultationNote[]>([]);
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Subscribe to notes when person changes
  useEffect(() => {
    if (!person) { setNotes([]); return; }
    return subscribeNotes(uid, person.id, setNotes);
  }, [uid, person]);

  const filtered = useMemo(
    () => filterType === 'all' ? notes : notes.filter(n => n.type === filterType),
    [notes, filterType],
  );

  const stats = useMemo(() => {
    const consultations = notes.filter(n => n.type !== 'note');
    const revenue = consultations
      .filter(n => n.paymentStatus === 'paid' && n.price)
      .reduce((s, n) => s + (n.price ?? 0), 0);
    const next = notes.find(n => n.status === 'scheduled');
    return { total: notes.length, consultations: consultations.length, revenue, next };
  }, [notes]);

  const handleAdd = useCallback(async () => {
    if (!person || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const dateTs = Timestamp.fromDate(new Date(form.date));
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
      await addNote(uid, person.id, {
        type: form.type,
        title: form.title.trim(),
        date: dateTs,
        notes: form.notes.trim(),
        ...(tags?.length ? { tags } : {}),
        ...(form.type !== 'note' && form.status ? { status: form.status } : {}),
        ...(form.price ? { price: parseFloat(form.price) } : {}),
        ...(form.type !== 'note' && form.paymentStatus ? { paymentStatus: form.paymentStatus } : {}),
      });
      setForm(BLANK);
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [uid, person, form]);

  const handleStatusChange = useCallback(async (noteId: string, status: NoteStatus) => {
    if (!person) return;
    await updateNote(uid, person.id, noteId, { status });
  }, [uid, person]);

  const handlePaymentChange = useCallback(async (noteId: string, paymentStatus: PaymentStatus) => {
    if (!person) return;
    await updateNote(uid, person.id, noteId, { paymentStatus });
  }, [uid, person]);

  const handleDelete = useCallback(async (noteId: string) => {
    if (!person || !window.confirm('Удалить запись?')) return;
    await deleteNote(uid, person.id, noteId);
  }, [uid, person]);

  // ── render ──────────────────────────────────────────────────────────────

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/40 gap-3">
        <span className="text-4xl">📋</span>
        <p className="text-sm">Выберите клиента из списка сохранённых профилей</p>
        <p className="text-xs">История консультаций появится здесь</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Person header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">{person.name}</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {person.date}{person.time ? ` ${person.time}` : ''}
              {person.location ? ` · ${person.location}` : ''}
            </p>
            {person.notes && (
              <p className="text-xs text-white/50 mt-1 italic">{person.notes}</p>
            )}
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
          >
            {showForm ? '✕ Отмена' : '+ Добавить'}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Записей', value: stats.total },
            { label: 'Консультаций', value: stats.consultations },
            { label: 'Доход', value: stats.revenue ? `${stats.revenue} ₽` : '—' },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-base font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/50">{s.label}</div>
            </div>
          ))}
        </div>

        {stats.next && (
          <div className="mt-2 text-xs text-amber-400/80">
            ⏳ Ближайшая сессия: {stats.next.title} — {tsToDisplay(stats.next.date)}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div ref={formRef} className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white/80">Новая запись</h3>

          {/* Type + date row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/50 block mb-1">Тип</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as NoteType }))}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                {(Object.entries(TYPE_LABELS) as [NoteType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Дата</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-white/50 block mb-1">Заголовок *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Тема сессии или краткое описание"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-white/50 block mb-1">Заметки</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Ключевые выводы, рекомендации, транзиты…"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder:text-white/30 resize-none"
            />
          </div>

          {/* Consult-specific fields */}
          {form.type !== 'note' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-white/50 block mb-1">Статус</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as NoteStatus }))}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="">—</option>
                  {(Object.entries(STATUS_LABELS) as [NoteStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Цена (₽)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Оплата</label>
                <select
                  value={form.paymentStatus}
                  onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="">—</option>
                  {(Object.entries(PAYMENT_LABELS) as [PaymentStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs text-white/50 block mb-1">Теги (через запятую)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="карьера, отношения, транзит Сатурна…"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={saving || !form.title.trim()}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Сохраняю…' : '💾 Сохранить запись'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      {notes.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {(['all', ...Object.keys(TYPE_LABELS)] as (NoteType | 'all')[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                filterType === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {t === 'all' ? `Все (${notes.length})` : TYPE_LABELS[t as NoteType]}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          {notes.length === 0 ? 'Нет записей. Добавьте первую консультацию.' : 'Нет записей в этой категории.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onStatusChange={handleStatusChange}
              onPaymentChange={handlePaymentChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ClientHistoryPanel;

/**
 * DateSegmentInput — сегментированный ввод даты ДД / ММ / ГГГГ
 * ─────────────────────────────────────────────────────────────
 * • Авто-переход DD→MM при 2 цифрах или первой цифре > 3
 * • Авто-переход MM→YYYY при 2 цифрах или первой цифре > 1
 * • Backspace из пустого поля возвращает на предыдущее
 * • Paste: парсит форматы YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY
 * • Sync с внешним value при загрузке профиля
 * • Работает в тёмной и светлой теме (цвет наследуется от родителя)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DateSegmentInputProps {
  /** ISO-дата YYYY-MM-DD или пустая строка */
  value: string;
  /** Вызывается только когда дата полностью введена (YYYY-MM-DD) */
  onChange: (isoDate: string) => void;
  /** Классы для внешнего контейнера (аналог inp) */
  className?: string;
  /** Для очень маленьких полей можно сократить плейсхолдеры */
  compact?: boolean;
}

export default function DateSegmentInput({
  value,
  onChange,
  className = '',
  compact = false,
}: DateSegmentInputProps) {
  const ddRef   = useRef<HTMLInputElement>(null);
  const mmRef   = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

  const [dd,   setDd]   = useState('');
  const [mm,   setMm]   = useState('');
  const [yyyy, setYyyy] = useState('');

  // ── Синхронизация с внешним value (загрузка профиля и т.п.) ──
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, mo, d] = value.split('-');
      setYyyy(y);
      setMm(mo);
      setDd(d);
    } else if (!value) {
      setYyyy(''); setMm(''); setDd('');
    }
  }, [value]);

  // ── Сборка и эмит ISO-даты ──
  const emit = useCallback((d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const di = parseInt(d, 10);
      const mi = parseInt(m, 10);
      const yi = parseInt(y, 10);
      if (di >= 1 && di <= 31 && mi >= 1 && mi <= 12 && yi >= 1000 && yi <= 2100) {
        onChange(`${y}-${m}-${d}`);
      }
    }
  }, [onChange]);

  // ── Обработчики ──

  function handleDd(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDd(raw);
    emit(raw, mm, yyyy);
    // Первая цифра >= 4 → нет валидного дня вида 4x, сразу переходим
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) >= 4)) {
      mmRef.current?.focus();
      mmRef.current?.select();
    }
  }

  function handleMm(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMm(raw);
    emit(dd, raw, yyyy);
    // Первая цифра >= 2 → нет валидного месяца вида 2x, сразу переходим
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) >= 2)) {
      yyyyRef.current?.focus();
      yyyyRef.current?.select();
    }
  }

  function handleYyyy(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYyyy(raw);
    emit(dd, mm, raw);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'dd' | 'mm' | 'yyyy',
  ) {
    const isEmpty = (e.currentTarget as HTMLInputElement).value === '';
    if (e.key === 'Backspace' && isEmpty) {
      e.preventDefault();
      if (field === 'mm')   { ddRef.current?.focus();   ddRef.current?.select(); }
      if (field === 'yyyy') { mmRef.current?.focus();   mmRef.current?.select(); }
    }
    // ArrowLeft/ArrowRight для навигации между полями
    if (e.key === 'ArrowRight') {
      if (field === 'dd')   { mmRef.current?.focus();   mmRef.current?.select(); }
      if (field === 'mm')   { yyyyRef.current?.focus(); yyyyRef.current?.select(); }
    }
    if (e.key === 'ArrowLeft') {
      if (field === 'mm')   { ddRef.current?.focus();   ddRef.current?.select(); }
      if (field === 'yyyy') { mmRef.current?.focus();   mmRef.current?.select(); }
    }
  }

  // ── Вставка полной даты ──
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').trim();
    // YYYY-MM-DD
    const isoM = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    // DD.MM.YYYY или DD/MM/YYYY
    const ruM  = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (isoM) {
      e.preventDefault();
      const [, y, mo, d] = isoM;
      setYyyy(y); setMm(mo); setDd(d);
      emit(d, mo, y);
      yyyyRef.current?.focus();
    } else if (ruM) {
      e.preventDefault();
      const [, d, mo, y] = ruM;
      const dp = d.padStart(2, '0');
      const mp = mo.padStart(2, '0');
      setDd(dp); setMm(mp); setYyyy(y);
      emit(dp, mp, y);
      yyyyRef.current?.focus();
    }
  }

  const seg = 'bg-transparent border-none outline-none text-center caret-current';

  return (
    <div
      className={`flex items-center cursor-text ${className}`}
      onClick={() => { if (!dd) ddRef.current?.focus(); else if (!mm) mmRef.current?.focus(); }}
    >
      <input
        ref={ddRef}
        type="text"
        inputMode="numeric"
        placeholder={compact ? 'ДД' : 'ДД'}
        maxLength={2}
        value={dd}
        onChange={handleDd}
        onKeyDown={e => handleKeyDown(e, 'dd')}
        onPaste={handlePaste}
        className={`${seg} w-8`}
      />
      <span className="opacity-40 select-none px-0.5">/</span>
      <input
        ref={mmRef}
        type="text"
        inputMode="numeric"
        placeholder="ММ"
        maxLength={2}
        value={mm}
        onChange={handleMm}
        onKeyDown={e => handleKeyDown(e, 'mm')}
        className={`${seg} w-8`}
      />
      <span className="opacity-40 select-none px-0.5">/</span>
      <input
        ref={yyyyRef}
        type="text"
        inputMode="numeric"
        placeholder={compact ? 'ГГГГ' : 'ГГГГ'}
        maxLength={4}
        value={yyyy}
        onChange={handleYyyy}
        onKeyDown={e => handleKeyDown(e, 'yyyy')}
        className={`${seg} w-14`}
      />
    </div>
  );
}

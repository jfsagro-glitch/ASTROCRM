// ─── usePushSubscription — WebPush opt-in + backend sync ─────────────────────
import { useEffect, useState, useCallback } from 'react';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || '';

type PushStatus = 'unsupported' | 'denied' | 'default' | 'granted' | 'unknown';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function usePushSubscription(userId?: string) {
  const [status, setStatus] = useState<PushStatus>('unknown');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupported()) { setStatus('unsupported'); return; }
    setStatus(Notification.permission as PushStatus);
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => { /* noop */ });
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[push] VITE_VAPID_PUBLIC_KEY не задан — подписка невозможна');
      return false;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          user_id: userId ?? null,
          prefs: { tz_offset_min: new Date().getTimezoneOffset() },
        }),
      });
      setSubscribed(true);
      return true;
    } catch (e) {
      console.error('[push] subscribe failed', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setSubscribed(false); return true; }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, user_id: userId ?? null }),
      }).catch(() => { /* best-effort */ });
      setSubscribed(false);
      return true;
    } catch (e) {
      console.error('[push] unsubscribe failed', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePrefs = useCallback(async (prefs: {
    morning_hour?: number; morning_minute?: number; enabled?: boolean;
  }): Promise<boolean> => {
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      const res = await fetch(`${API_URL}/api/push/prefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          tz_offset_min: new Date().getTimezoneOffset(),
          ...prefs,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('[push] updatePrefs failed', e);
      return false;
    }
  }, []);

  const scheduleMorning = useCallback(async (
    hour: number, minute: number, body: string,
  ): Promise<boolean> => {
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      // compute next local hh:mm in UTC
      const now = new Date();
      const fire = new Date(now);
      fire.setHours(hour, minute, 0, 0);
      if (fire.getTime() <= now.getTime()) fire.setDate(fire.getDate() + 1);
      const dedup = `morning:${fire.toISOString().slice(0, 10)}`;
      const res = await fetch(`${API_URL}/api/push/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint:    sub.endpoint,
          fire_at_utc: fire.toISOString(),
          title:       '✦ Astro Daily',
          body,
          url:         '/',
          dedup_key:   dedup,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('[push] scheduleMorning failed', e);
      return false;
    }
  }, []);

  const testNow = useCallback(async (body = 'Тест: уведомления работают ✦'): Promise<boolean> => {
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return false;
      const res = await fetch(`${API_URL}/api/push/test-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, title: '✦ Astro Daily', body, url: '/' }),
      });
      return res.ok;
    } catch (e) {
      console.error('[push] testNow failed', e);
      return false;
    }
  }, []);

  return { status, subscribed, loading, subscribe, unsubscribe, updatePrefs, scheduleMorning, testNow, supported: isSupported() };
}

/**
 * AuthPage — email/password login & registration with email verification.
 * Shown only when Firebase is configured and user is not authenticated.
 */
import React, { useState } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, UserPlus, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'login' | 'register';

function mapFirebaseError(code: string | undefined): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Неверный email или пароль';
    case 'auth/email-already-in-use':
      return 'Этот email уже используется';
    case 'auth/weak-password':
      return 'Пароль слишком короткий (минимум 6 символов)';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Подождите немного и повторите';
    case 'auth/invalid-email':
      return 'Некорректный формат email';
    default:
      return 'Ошибка авторизации. Проверьте данные и попробуйте снова';
  }
}

// ─── Email not verified screen ────────────────────────────────────────────────
function VerifyEmailScreen() {
  const { user, resendVerification, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const checkVerified = async () => {
    setLoading(true);
    try {
      await user!.reload();
      if (user!.emailVerified) window.location.reload();
      else setError('Email ещё не подтверждён. Проверьте папку «Спам».');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true); setError(null);
    try {
      await resendVerification();
      setSent(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full rounded-2xl border border-amber-300/20 bg-slate-900/90 p-8 text-center space-y-5">
        <Sparkles className="h-10 w-10 text-amber-300 mx-auto" />
        <h2 className="text-xl font-bold text-amber-200 font-serif">Подтвердите email</h2>
        <p className="text-amber-50/70 text-sm leading-relaxed">
          Мы отправили письмо на{' '}
          <strong className="text-amber-200">{user?.email}</strong>.<br />
          Перейдите по ссылке в письме для активации аккаунта.
        </p>
        {error && <p className="text-red-400 text-xs bg-red-500/10 rounded-lg p-2">{error}</p>}
        {sent && <p className="text-green-400 text-xs bg-green-500/10 rounded-lg p-2">Письмо отправлено повторно</p>}
        <div className="flex flex-col gap-2">
          <button
            onClick={checkVerified}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Проверяю…' : '✓ Я подтвердил — продолжить'}
          </button>
          <button
            onClick={resend}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm text-amber-50/60 border border-amber-300/20 hover:border-amber-300/40 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Отправить письмо ещё раз
          </button>
          <button
            onClick={signOut}
            className="text-xs text-amber-50/30 hover:text-amber-50/60 transition-colors mt-1"
          >
            Выйти и войти другим аккаунтом
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login / Register form ────────────────────────────────────────────────────
export default function AuthPage() {
  const { user, signIn, register } = useAuth();

  // If logged in but email not verified, show verification screen
  if (user && !user.emailVerified) return <VerifyEmailScreen />;

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const switchTab = (t: Tab) => { setTab(t); setError(null); setSuccess(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (tab === 'login') {
        await signIn(email, password);
        // onAuthStateChanged in AuthContext takes over; App re-renders
      } else {
        await register(email, password);
        setSuccess('Аккаунт создан! Откройте письмо и перейдите по ссылке подтверждения.');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: [
          'radial-gradient(ellipse at 30% 0%, rgba(79,70,229,.25) 0%, transparent 60%)',
          'radial-gradient(ellipse at 70% 100%, rgba(168,85,247,.15) 0%, transparent 50%)',
          '#020617',
        ].join(', '),
      }}
    >
      <div className="max-w-sm w-full rounded-2xl border border-amber-300/20 bg-slate-950/90 backdrop-blur-xl p-8 space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <Sparkles className="h-10 w-10 text-amber-300 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-amber-200 font-serif">HOLO Astro CRM</h1>
          <p className="text-amber-50/40 text-sm">Персонализированная астрология</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-amber-50/60 hover:text-amber-50'
              }`}
            >
              {t === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs text-amber-50/60 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-50/30 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-amber-300/20 bg-white/5 text-amber-50 text-sm placeholder:text-amber-50/20 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs text-amber-50/60 block">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-50/30 pointer-events-none" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Минимум 6 символов' : '••••••••'}
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-amber-300/20 bg-white/5 text-amber-50 text-sm placeholder:text-amber-50/20 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-50/30 hover:text-amber-50/60 transition-colors"
                aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error   && <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-green-400 text-xs bg-green-500/10 rounded-lg px-3 py-2">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {loading
              ? '…'
              : tab === 'login'
              ? <><LogIn className="h-4 w-4" /> Войти</>
              : <><UserPlus className="h-4 w-4" /> Создать аккаунт</>}
          </button>
        </form>

        <p className="text-center text-xs text-amber-50/30">
          {tab === 'login'
            ? <>Нет аккаунта? <button onClick={() => switchTab('register')} className="text-amber-400 hover:text-amber-300 underline">Зарегистрироваться</button></>
            : <>Уже есть аккаунт? <button onClick={() => switchTab('login')} className="text-amber-400 hover:text-amber-300 underline">Войти</button></>}
        </p>
      </div>
    </div>
  );
}

/**
 * AuthContext — email/password Firebase Auth with email verification.
 * If Firebase is not configured (no env vars) the app works in guest mode.
 */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { auth, loginWithEmail, registerWithEmail, logout, firebaseConfigured } from '../firebase';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, pw: string) => Promise<void>;
  register: (email: string, pw: string) => Promise<User>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn: AuthCtx['signIn'] = async (email, pw) => {
    await loginWithEmail(email, pw);
  };

  const register: AuthCtx['register'] = async (email, pw) => {
    const cred = await registerWithEmail(email, pw);
    await sendEmailVerification(cred.user);
    return cred.user;
  };

  const resendVerification: AuthCtx['resendVerification'] = async () => {
    if (user) await sendEmailVerification(user);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      configured: firebaseConfigured,
      signIn,
      register,
      resendVerification,
      signOut: logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

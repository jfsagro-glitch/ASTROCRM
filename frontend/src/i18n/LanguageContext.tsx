import React, { createContext, useContext, useState } from 'react';
import type { Lang, Translations } from './translations';
import { translations } from './translations';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: Translations;
}

function getInitialLang(): Lang {
  try { return (localStorage.getItem('holo-lang') as Lang) || 'ru'; } catch { return 'ru'; }
}

const Ctx = createContext<LangCtx>({
  lang: 'ru',
  setLang: () => {},
  tr: translations.ru,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('holo-lang', l); } catch { /* ignore */ }
  };

  return (
    <Ctx.Provider value={{ lang, setLang, tr: translations[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { translations, defaultLocale } from '../lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const router = useRouter();
  const routeLocale = String(router.query.lang || '').trim().toLowerCase();
  const [locale, setLocale] = useState(() => (
    routeLocale && translations[routeLocale] ? routeLocale : defaultLocale
  ));

  useEffect(() => {
    if (routeLocale && translations[routeLocale]) {
      setLocale(routeLocale);
    }
  }, [routeLocale]);

  // Persist language preference
  useEffect(() => {
    if (routeLocale && translations[routeLocale]) return;

    const saved = localStorage.getItem('hirehub_locale');
    if (saved && translations[saved]) setLocale(saved);
  }, [routeLocale]);

  function changeLocale(newLocale) {
    if (!translations[newLocale]) return;
    setLocale(newLocale);
    localStorage.setItem('hirehub_locale', newLocale);
  }

  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t, dir: t.dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

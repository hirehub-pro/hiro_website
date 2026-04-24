import { createContext, useContext, useEffect, useState } from 'react';
import { translations, defaultLocale } from '../lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(defaultLocale);

  // Persist language preference
  useEffect(() => {
    const saved = localStorage.getItem('hirehub_locale');
    if (saved && translations[saved]) setLocale(saved);
  }, []);

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

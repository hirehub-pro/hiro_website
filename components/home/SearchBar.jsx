import { useState } from 'react';
import { useRouter } from 'next/router';
import { HiLightningBolt, HiSearch } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SearchBar({ fullWidth = false }) {
  const { t }          = useLanguage();
  const router         = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center ${fullWidth ? 'w-full' : 'w-full max-w-2xl'} animate-fade-up`}
    >
      <div className="glass relative w-full overflow-hidden rounded-[28px] border border-white/70 p-2 shadow-hero">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative flex items-center gap-2">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-glow-sm sm:flex">
            <HiLightningBolt className="h-5 w-5" />
          </div>
          <div className="relative flex-1">
            <HiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              className="input-field h-14 rounded-2xl border-white/70 bg-white/90 pl-12 pr-4 text-sm shadow-inner placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            className="btn-primary h-14 shrink-0 rounded-2xl px-5 sm:px-7"
          >
            <span className="hidden sm:inline">{t.nav.search}</span>
            <HiSearch className="h-5 w-5 sm:hidden" />
          </button>
        </div>
      </div>
    </form>
  );
}

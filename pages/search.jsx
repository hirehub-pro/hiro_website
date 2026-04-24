import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  HiSearch, HiAdjustments, HiLocationMarker, HiX,
  HiBadgeCheck, HiStar, HiSparkles, HiChevronDown,
} from 'react-icons/hi';
import clsx from 'clsx';
import { searchWorkers } from '../lib/firestore';
import WorkerCard from '../components/workers/WorkerCard';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const { t, dir } = useLanguage();
  const router     = useRouter();
  const inputRef   = useRef(null);

  const [query, setQuery]           = useState('');
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius]         = useState(50);
  const [userLat, setUserLat]       = useState(null);
  const [userLng, setUserLng]       = useState(null);

  useEffect(() => {
    if (router.query.q) {
      setQuery(router.query.q);
      doSearch(router.query.q, userLat, userLng, radius);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.q]);

  async function doSearch(profession, lat, lng, rad) {
    if (!String(profession || '').trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchWorkers({ profession, lat, lng, radiusKm: rad });
      setWorkers(results);
    } catch (err) {
      toast.error(t.common.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doSearch(query, userLat, userLng, radius);
  }

  function clearQuery() {
    setQuery('');
    setWorkers([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }

  function useLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        toast.success('Location acquired!');
        doSearch(query, pos.coords.latitude, pos.coords.longitude, radius);
      },
      () => toast.error('Could not get location')
    );
  }

  const radiusPresets = [10, 25, 50, 100];

  return (
    <>
      <Head><title>{query ? `"${query}" – HireHub` : 'Search – HireHub'}</title></Head>

      {/* ── Sticky glass header ── */}
      <div
        className="sticky top-0 md:top-16 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl"
        dir={dir}
      >
        {/* Search bar row */}
        <div className="mx-auto max-w-3xl px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <HiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-10 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  <HiX className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={clsx(
                'flex h-12 items-center gap-1.5 rounded-2xl border px-4 text-sm font-semibold transition-colors',
                showFilters
                  ? 'border-primary bg-primary-50 text-primary'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <HiAdjustments className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {userLat && (
                <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
              )}
            </button>

            {/* Search submit */}
            <button
              type="submit"
              disabled={!query.trim()}
              className="btn-primary h-12 shrink-0 rounded-2xl px-5 disabled:opacity-50"
            >
              <HiSearch className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">{t.nav.search}</span>
            </button>
          </form>

          {/* ── Filter panel ── */}
          {showFilters && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="border-b border-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Filters</p>
              </div>
              <div className="px-4 py-4 space-y-4">
                {/* Radius presets */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      {t.search.radius}
                    </label>
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {radius} km
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {radiusPresets.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadius(r)}
                        className={clsx(
                          'rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors',
                          radius === r
                            ? 'bg-primary text-white shadow-glow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {r} km
                      </button>
                    ))}
                    <span className="self-center text-xs text-gray-400">or</span>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={5}
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="flex-1 accent-primary"
                      style={{ minWidth: 80 }}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiLocationMarker className={clsx('h-4 w-4', userLat ? 'text-green-500' : 'text-gray-400')} />
                    {userLat ? (
                      <span className="font-semibold text-green-700">Location active — searching nearby</span>
                    ) : (
                      <span>Enable location for nearby results</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={useLocation}
                    className={clsx(
                      'rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                      userLat
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-primary-50 text-primary hover:bg-primary-100'
                    )}
                  >
                    {userLat ? 'Update' : t.search.useLocation}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results count bar */}
        {hasSearched && !loading && (
          <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2">
            <div className="mx-auto max-w-3xl flex items-center gap-2">
              <span className={clsx(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                workers.length > 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {workers.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {workers.length === 1
                  ? `result for "${query}"`
                  : `results for "${query}"`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Results area ── */}
      <div className="mx-auto max-w-3xl px-4 py-5" dir={dir}>

        {/* Skeleton loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 overflow-hidden rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-2/5 rounded-lg bg-gray-200" />
                  <div className="h-3 w-3/5 rounded-lg bg-gray-100" />
                  <div className="h-2.5 w-1/4 rounded-full bg-gray-100" />
                </div>
                <div className="h-10 w-16 shrink-0 rounded-2xl bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {/* Results list */}
        {!loading && workers.length > 0 && (
          <div className="space-y-3">
            {workers.map((w, i) => (
              <div
                key={w.uid}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
              >
                <WorkerCard worker={w} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state — after search */}
        {!loading && hasSearched && workers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gray-100">
              <HiSearch className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800">{t.search.noResults}</h3>
            <p className="mt-2 max-w-xs text-sm text-gray-400">
              Try a different profession or expand your search radius in Filters.
            </p>
            <button
              type="button"
              onClick={clearQuery}
              className="mt-6 btn-ghost rounded-2xl px-6"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Initial state — nothing searched yet */}
        {!loading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-hero-gradient shadow-glow">
              <HiSparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800">Find a professional</h3>
            <p className="mt-2 max-w-xs text-sm text-gray-400">
              Search by profession name — e.g. Plumber, Electrician, Painter.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

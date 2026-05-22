import { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  HiLocationMarker, HiSearch, HiSelector, HiSwitchHorizontal, HiX,
  HiSparkles,
} from 'react-icons/hi';
import {
  FaBolt,
  FaBroom,
  FaBug,
  FaHammer,
  FaHome,
  FaPaintRoller,
  FaSnowflake,
  FaTools,
  FaTree,
  FaTruck,
  FaWrench,
} from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import clsx from 'clsx';
import { doc, getDoc } from 'firebase/firestore';
import { searchWorkers } from '../../lib/firestore';
import { db } from '../../lib/firebase';
import { findProfessionBySlug, slugifyProfession } from '../../lib/search-routing';
import { getProfessionSeoData } from '../../lib/profession-seo';
import WorkerCard from '../workers/WorkerCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

function getProfessionLabel(profession, locale) {
  return profession[locale] || profession.en || profession.he || profession.ar || profession.logo || 'Profession';
}

const professionLogoIcons = {
  ac: FaSnowflake,
  air_conditioning: FaSnowflake,
  carpentry: FaHammer,
  carpenter: FaHammer,
  cleaning: FaBroom,
  cleaner: FaBroom,
  electrical: FaBolt,
  electrician: FaBolt,
  flooring: FaHome,
  handyman: FaTools,
  landscaping: FaTree,
  landscaper: FaTree,
  moving: FaTruck,
  mover: FaTruck,
  painting: FaPaintRoller,
  painter: FaPaintRoller,
  pest_control: FaBug,
  plumbing: FaWrench,
  plumber: FaWrench,
  roofing: FaHome,
  roofer: FaHome,
};

const materialIconAliases = {
  door_front_door: 'MdDoorFront',
  locksmith: 'MdLockOpen',
  paint_rounded: 'MdFormatPaint',
  construction_rounded: 'MdConstruction',
  plumbing_rounded: 'MdPlumbing',
  engineering_outlined: 'MdEngineering',
  woman: 'MdWoman',
  man: 'MdMan',
  chair: 'MdChair',
};

function getMaterialIconByName(name) {
  if (!name) return null;

  const aliasedName = materialIconAliases[name];
  if (aliasedName && typeof MdIcons[aliasedName] === 'function') {
    return MdIcons[aliasedName];
  }

  const generatedName = `Md${name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;

  return typeof MdIcons[generatedName] === 'function'
    ? MdIcons[generatedName]
    : null;
}

function getProfessionIcon(profession) {
  const logoKey = String(profession.logo || profession.en || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const materialIcon = getMaterialIconByName(logoKey);
  if (materialIcon) {
    return materialIcon;
  }

  return professionLogoIcons[logoKey] || FaTools;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function sortWorkers(workers, sortBy) {
  const items = [...workers];

  if (sortBy === 'name') {
    return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  if (sortBy === 'nearest') {
    return items.sort((a, b) => {
      const distanceA = typeof a.distanceKm === 'number' ? a.distanceKm : Number.POSITIVE_INFINITY;
      const distanceB = typeof b.distanceKm === 'number' ? b.distanceKm : Number.POSITIVE_INFINITY;

      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      return (b.avgRating || 0) - (a.avgRating || 0);
    });
  }

  return items.sort((a, b) => {
    const ratingDiff = (b.avgRating || 0) - (a.avgRating || 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
    if (reviewDiff !== 0) {
      return reviewDiff;
    }

    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export default function SearchPageContent({ categorySlug = '' }) {
  const { t, dir, locale } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const inputRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const radiusFilterHiddenRef = useRef(false);

  const [query, setQuery] = useState('');
  const [workers, setWorkers] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [professionsLoading, setProfessionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [filterByWorkRadius, setFilterByWorkRadius] = useState(false);
  const [showRadiusFilter, setShowRadiusFilter] = useState(true);

  useEffect(() => {
    const preferredLat =
      typeof profile?.activeSearchLat === 'number' ? profile.activeSearchLat : profile?.lat;
    const preferredLng =
      typeof profile?.activeSearchLng === 'number' ? profile.activeSearchLng : profile?.lng;

    if (typeof preferredLat === 'number' && typeof preferredLng === 'number') {
      setUserLat(preferredLat);
      setUserLng(preferredLng);
    }
  }, [profile?.activeSearchLat, profile?.activeSearchLng, profile?.lat, profile?.lng]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfessions() {
      setProfessionsLoading(true);
      try {
        const snap = await getDoc(doc(db, 'metadata', 'professions'));
        if (!isMounted) return;

        const items = (snap.data()?.items || [])
          .map((item, index) => ({
            id: String(item.id ?? index),
            value: item.en || item.logo || getProfessionLabel(item, locale),
            ...item,
          }))
          .sort((a, b) => Number(a.id) - Number(b.id));

        setProfessions(items);
      } catch (err) {
        if (isMounted) {
          setProfessions([]);
          toast.error('Failed to load professions');
        }
      } finally {
        if (isMounted) {
          setProfessionsLoading(false);
        }
      }
    }

    loadProfessions();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    if (!router.isReady) return;

    if (categorySlug && professions.length > 0) {
      const matchedProfession = findProfessionBySlug(professions, categorySlug);
      const resolvedValue = matchedProfession?.value
        || matchedProfession?.en
        || String(categorySlug).replace(/-/g, ' ');

      setQuery(resolvedValue);
      doSearch(resolvedValue, userLat, userLng);
      return;
    }

    if (typeof router.query.q === 'string' && router.query.q.trim()) {
      setQuery(router.query.q);
      doSearch(router.query.q, userLat, userLng);
      return;
    }

    setQuery('');
    setWorkers([]);
    setHasSearched(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, professions, router.isReady, router.query.q]);

  useEffect(() => {
    if (!hasSearched || !String(query || '').trim()) return;
    if (typeof userLat !== 'number' || typeof userLng !== 'number') return;

    doSearch(query, userLat, userLng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng]);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY < 24) {
        setShowRadiusFilter(true);
        radiusFilterHiddenRef.current = false;
      } else if (!radiusFilterHiddenRef.current && scrollDelta > 18 && currentScrollY > 180) {
        setShowRadiusFilter(false);
        radiusFilterHiddenRef.current = true;
      } else if (radiusFilterHiddenRef.current && scrollDelta < -24) {
        setShowRadiusFilter(true);
        radiusFilterHiddenRef.current = false;
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function doSearch(profession, lat, lng) {
    if (!String(profession || '').trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchWorkers({
        profession,
        professionTerms: matchedProfessionTerms,
      });
      const resultsWithDistance = results.map((worker) => ({
        ...worker,
        distanceKm:
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          typeof worker.lat === 'number' &&
          typeof worker.lng === 'number'
            ? haversineKm(lat, lng, worker.lat, worker.lng)
            : null,
      }));
      setWorkers(resultsWithDistance);
    } catch (err) {
      toast.error(t.common.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    const matchedProfession = professions.find((profession) => {
      const candidates = [profession.value, profession.en, profession.he, profession.ar, profession.logo];
      return candidates.some((value) => (
        String(value || '').trim().toLowerCase() === normalizedQuery.toLowerCase()
      ));
    });

    if (matchedProfession) {
      const professionValue = matchedProfession.value || matchedProfession.en || normalizedQuery;
      router.push(`/search/${slugifyProfession(professionValue)}`);
      return;
    }

    router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
  }

  function chooseProfession(profession) {
    const value = profession.value || profession.en || getProfessionLabel(profession, locale);
    router.push(`/search/${slugifyProfession(value)}`);
  }

  const matchedProfession = useMemo(() => (
    categorySlug ? findProfessionBySlug(professions, categorySlug) : null
  ), [categorySlug, professions]);
  const matchedProfessionTerms = useMemo(() => {
    if (!matchedProfession) return [];

    return [
      matchedProfession.value,
      matchedProfession.en,
      matchedProfession.he,
      matchedProfession.ar,
      matchedProfession.am,
      matchedProfession.ru,
      matchedProfession.logo,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
  }, [matchedProfession]);

  function clearQuery() {
    setQuery('');
    setWorkers([]);
    setHasSearched(false);
    router.push('/search');
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
        doSearch(query, pos.coords.latitude, pos.coords.longitude);
      },
      () => toast.error('Could not get location')
    );
  }

  const sortOptions = [
    { value: 'rating', label: t.search.sortRating },
    { value: 'nearest', label: t.search.sortNearest },
    { value: 'name', label: t.search.sortName },
  ];
  const filteredProfessions = professions.filter((profession) => {
    const searchValue = query.trim().toLowerCase();
    if (!searchValue || hasSearched) return true;

    return [
      profession.en,
      profession.he,
      profession.ar,
      profession.am,
      profession.ru,
      profession.logo,
    ].some((value) => String(value || '').toLowerCase().includes(searchValue));
  });
  const sortedWorkers = sortWorkers(workers, sortBy);
  const displayedWorkers = filterByWorkRadius
    ? sortedWorkers.filter((worker) => (
      typeof worker.distanceKm === 'number' &&
      typeof worker.workRadius === 'number' &&
      worker.distanceKm * 1000 <= worker.workRadius
    ))
    : sortedWorkers;
  const categorySeo = useMemo(() => {
    if (!categorySlug) return null;
    const professionSlug = matchedProfession
      ? slugifyProfession(matchedProfession.value || matchedProfession.en || matchedProfession.logo || categorySlug)
      : categorySlug;
    return getProfessionSeoData(professionSlug, locale);
  }, [categorySlug, locale, matchedProfession]);
  const pageTitle = categorySeo?.title || (query ? `"${query}" – Hiro` : 'Search – Hiro');
  const pageDescription = categorySeo?.description || 'Find trusted professionals near you on Hiro.';
  const pageKeywords = categorySeo?.keywords?.join(', ') || '';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {pageKeywords ? <meta name="keywords" content={pageKeywords} /> : null}
      </Head>

      <div
        className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl md:top-16"
        dir={dir}
      >
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

            <button
              type="button"
              onClick={useLocation}
              className={clsx(
                'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                userLat
                  ? 'border-green-200 bg-green-50 text-green-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-primary'
              )}
              aria-label={t.search.useLocation}
            >
              <HiLocationMarker className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={!query.trim()}
              className="btn-primary h-12 shrink-0 rounded-2xl px-5 disabled:opacity-50"
            >
              <HiSearch className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">{t.nav.search}</span>
            </button>
          </form>

          <div
            className={clsx(
              'mt-3 overflow-hidden rounded-[24px] border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-amber-50/70 shadow-[0_20px_60px_-30px_rgba(245,158,11,0.45)] transition-all duration-300',
              showRadiusFilter
                ? 'max-h-40 translate-y-0 opacity-100 p-3 sm:mt-4 sm:max-h-48 sm:p-4'
                : 'max-h-0 -translate-y-3 border-transparent p-0 opacity-0'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-amber-100 text-amber-500 shadow-inner shadow-amber-200/70 sm:h-14 sm:w-14 sm:rounded-[22px]">
                <HiSwitchHorizontal className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                  {t.search.workRadiusTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {userLat
                    ? t.search.workRadiusSubtitle
                    : t.search.workRadiusNeedsLocation}
                </p>
                {userLat && (
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500 sm:mt-2 sm:text-xs">
                    {filterByWorkRadius ? t.search.workRadiusOn : t.search.workRadiusOff}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!userLat || !userLng) {
                    toast.error(t.search.workRadiusEnableLocation);
                    return;
                  }
                  setFilterByWorkRadius((current) => !current);
                }}
                className={clsx(
                  'relative flex h-10 w-16 shrink-0 items-center rounded-full p-1 transition-all duration-300 sm:h-14 sm:w-24 sm:p-1.5',
                  filterByWorkRadius
                    ? 'bg-gradient-to-r from-amber-300 to-amber-200 shadow-[0_10px_30px_-15px_rgba(245,158,11,0.9)]'
                    : 'bg-slate-200/90'
                )}
                aria-pressed={filterByWorkRadius}
                aria-label={t.search.workRadiusTitle}
              >
                <span
                  className={clsx(
                    'absolute h-8 w-8 rounded-full transition-all duration-300 sm:h-11 sm:w-11',
                    filterByWorkRadius
                      ? 'translate-x-7 bg-amber-400 shadow-lg shadow-amber-300/80 sm:translate-x-10'
                      : 'translate-x-0 bg-white shadow-lg shadow-slate-300/70'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {hasSearched && !loading && (
          <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  displayedWorkers.length > 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {displayedWorkers.length}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {displayedWorkers.length === 1
                    ? `result for "${query}"`
                    : `results for "${query}"`}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-[22px] border border-white/80 bg-white/80 p-1.5 shadow-sm shadow-slate-200/60 backdrop-blur">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <HiSelector className="h-4 w-4 text-primary" />
                  {t.search.sort}
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSortBy(option.value)}
                      className={clsx(
                        'rounded-2xl px-3 py-2 text-xs font-semibold transition-all duration-200',
                        sortBy === option.value
                          ? 'bg-hero-gradient text-white shadow-glow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5" dir={dir}>
        {categorySeo ? (
          <section className="mb-5 rounded-[26px] border border-primary/10 bg-primary-50/60 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Hiro</p>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {matchedProfession ? getProfessionLabel(matchedProfession, locale) : query}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {categorySeo.intro}
            </p>
          </section>
        ) : null}

        {!loading && !hasSearched && (
          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-primary/65">Browse all</p>
                <h2 className="section-title">{t.home.popularCategories}</h2>
              </div>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
                {professions.length}
              </span>
            </div>

            {professionsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="h-32 rounded-[26px] bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filteredProfessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                No professions found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {filteredProfessions.map((profession, index) => {
                  const Icon = getProfessionIcon(profession);
                  const color = profession.color || '#1976D2';

                  return (
                    <button
                      key={profession.id}
                      type="button"
                      onClick={() => chooseProfession(profession)}
                      className="card-lift group relative min-h-32 overflow-hidden rounded-[26px] border border-white/70 bg-white p-4 text-left shadow-card animate-fade-up"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent opacity-80" />
                      <div
                        className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
                        style={{ backgroundColor: `${color}1A`, color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="relative line-clamp-2 text-sm font-bold leading-tight text-gray-800">
                        {getProfessionLabel(profession, locale)}
                      </span>
                      <span className="relative mt-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Explore
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

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

        {!loading && displayedWorkers.length > 0 && (
          <div className="space-y-3">
            {displayedWorkers.map((w, i) => (
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

        {!loading && hasSearched && displayedWorkers.length === 0 && (
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

        {!loading && !hasSearched && professions.length === 0 && (
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

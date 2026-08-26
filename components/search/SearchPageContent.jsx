import { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  HiLocationMarker, HiSearch, HiSwitchHorizontal, HiX,
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
import {
  MdChair,
  MdConstruction,
  MdDoorFront,
  MdEngineering,
  MdFormatPaint,
  MdLockOpen,
  MdMan,
  MdPlumbing,
  MdWoman,
} from 'react-icons/md';
import clsx from 'clsx';
import { searchWorkers } from '../../lib/firestore';
import { buildLocalizedSearchPath, findProfessionBySlug, slugifyProfession } from '../../lib/search-routing';
import { getSearchPageSeo } from '../../lib/page-seo';
import { PROFESSION_CATALOG } from '../../lib/profession-catalog';
import { getProfessionPageContent } from '../../lib/profession-page-content';
import WorkerCard from '../workers/WorkerCard';
import { ProfessionHero, ProfessionSeoSections } from './ProfessionSeoContent';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const SEARCH_PAGE_SIZE = 20;

function getProfessionLabel(profession, locale) {
  return profession[locale] || profession.en || profession.he || profession.ar || profession.logo || 'Profession';
}

function getProfessionSearchValue(profession, fallback = '') {
  return profession?.value || profession?.en || profession?.logo || fallback;
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
  door_front_door: MdDoorFront,
  locksmith: MdLockOpen,
  paint_rounded: MdFormatPaint,
  construction_rounded: MdConstruction,
  plumbing_rounded: MdPlumbing,
  engineering_outlined: MdEngineering,
  woman: MdWoman,
  man: MdMan,
  chair: MdChair,
};

function getMaterialIconByName(name) {
  if (!name) return null;
  return materialIconAliases[name] || null;
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

function addWorkerDistances(workers, lat, lng) {
  return workers.map((worker) => ({
    ...worker,
    distanceKm:
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      typeof worker.lat === 'number' &&
      typeof worker.lng === 'number'
        ? haversineKm(lat, lng, worker.lat, worker.lng)
        : null,
  }));
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

const LOCAL_PROFESSIONS = PROFESSION_CATALOG.map((profession) => ({
  ...profession,
  value: profession.en,
  id: String(profession.id),
}));

export default function SearchPageContent({ categorySlug = '', profession: initialProfession = null }) {
  const { t, dir, locale } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const routeLocale = typeof router.query.lang === 'string' ? router.query.lang : '';
  const inputRef = useRef(null);
  const searchCursorRef = useRef(null);
  const lastSearchKeyRef = useRef('');
  const lastSearchProfessionRef = useRef('');
  const pendingSearchRef = useRef('');
  const searchGenerationRef = useRef(0);
  const userLocationRef = useRef({ lat: null, lng: null });

  const [query, setQuery] = useState(() => (
    categorySlug && initialProfession
      ? getProfessionLabel(initialProfession, locale)
      : ''
  ));
  const [workers, setWorkers] = useState([]);
  const professions = LOCAL_PROFESSIONS;
  const [loading, setLoading] = useState(Boolean(categorySlug));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreWorkers, setHasMoreWorkers] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(categorySlug));
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [filterByWorkRadius, setFilterByWorkRadius] = useState(true);

  useEffect(() => {
    const preferredLat =
      typeof profile?.activeSearchLat === 'number' ? profile.activeSearchLat : profile?.lat;
    const preferredLng =
      typeof profile?.activeSearchLng === 'number' ? profile.activeSearchLng : profile?.lng;

    if (typeof preferredLat === 'number' && typeof preferredLng === 'number') {
      userLocationRef.current = { lat: preferredLat, lng: preferredLng };
      setUserLat(preferredLat);
      setUserLng(preferredLng);
    }
  }, [profile?.activeSearchLat, profile?.activeSearchLng, profile?.lat, profile?.lng]);

  useEffect(() => {
    if (!router.isReady) return;

    if (categorySlug && professions.length > 0) {
      const matchedProfession = findProfessionBySlug(professions, categorySlug);
      const resolvedValue = getProfessionSearchValue(
        matchedProfession,
        String(categorySlug).replace(/-/g, ' ')
      );
      const resolvedLabel = matchedProfession
        ? getProfessionLabel(matchedProfession, locale)
        : resolvedValue;

      setQuery(resolvedLabel);
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
    setHasMoreWorkers(false);
    searchGenerationRef.current += 1;
    searchCursorRef.current = null;
    lastSearchKeyRef.current = '';
    lastSearchProfessionRef.current = '';
    pendingSearchRef.current = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, locale, professions, router.isReady, router.query.q]);

  useEffect(() => {
    userLocationRef.current = { lat: userLat, lng: userLng };
    if (typeof userLat !== 'number' || typeof userLng !== 'number') return;

    setWorkers((currentWorkers) => addWorkerDistances(currentWorkers, userLat, userLng));
  }, [userLat, userLng]);

  async function doSearch(profession, _lat, _lng, { append = false, force = false, sort = sortBy } = {}) {
    const normalizedProfession = String(profession || '').trim();
    if (!normalizedProfession) return;

    const searchKey = JSON.stringify({
      profession: normalizedProfession.toLowerCase(),
      professionTerms: matchedProfessionTerms.map((term) => term.toLowerCase()).sort(),
      sort,
    });
    const cursor = append ? searchCursorRef.current : null;
    const requestKey = `${searchKey}:${append ? cursor?.id || 'end' : 'first'}`;

    if (pendingSearchRef.current === requestKey) return;
    if (!append && !force && lastSearchKeyRef.current === searchKey) return;
    if (append && (!hasMoreWorkers || !cursor)) return;

    const generation = append ? searchGenerationRef.current : searchGenerationRef.current + 1;
    if (!append) {
      searchGenerationRef.current = generation;
      searchCursorRef.current = null;
      setHasMoreWorkers(false);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    pendingSearchRef.current = requestKey;
    lastSearchProfessionRef.current = normalizedProfession;
    setHasSearched(true);

    try {
      const result = await searchWorkers({
        profession: normalizedProfession,
        professionTerms: matchedProfessionTerms,
        sortBy: sort,
        cursor,
        pageSize: SEARCH_PAGE_SIZE,
      });

      if (generation !== searchGenerationRef.current) return;

      const { lat, lng } = userLocationRef.current;
      const nextWorkers = addWorkerDistances(result.workers, lat, lng);
      setWorkers((currentWorkers) => {
        if (!append) return nextWorkers;

        const currentWorkerIds = new Set(currentWorkers.map((worker) => worker.uid));
        return [...currentWorkers, ...nextWorkers.filter((worker) => !currentWorkerIds.has(worker.uid))];
      });
      searchCursorRef.current = result.cursor;
      setHasMoreWorkers(result.hasMore);
      lastSearchKeyRef.current = searchKey;
    } catch (err) {
      if (!append && generation === searchGenerationRef.current) {
        lastSearchKeyRef.current = '';
      }
      toast.error(t.common.error);
      console.error(err);
    } finally {
      if (pendingSearchRef.current === requestKey) {
        pendingSearchRef.current = '';
      }
      if (generation === searchGenerationRef.current) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  }

  function loadMoreWorkers() {
    const profession = lastSearchProfessionRef.current;
    if (!profession) return;
    doSearch(profession, userLat, userLng, { append: true, sort: sortBy });
  }

  function changeSort(nextSort) {
    if (nextSort === sortBy) return;
    setSortBy(nextSort);

    const profession = lastSearchProfessionRef.current;
    if (profession) {
      doSearch(profession, userLat, userLng, { force: true, sort: nextSort });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    const matchedProfession = professions.find((profession) => {
      const candidates = [
        profession.value,
        profession.en,
        profession.he,
        profession.ar,
        profession.am,
        profession.ru,
        profession.logo,
      ];
      return candidates.some((value) => (
        String(value || '').trim().toLowerCase() === normalizedQuery.toLowerCase()
      ));
    });

    if (matchedProfession) {
      const professionValue = getProfessionSearchValue(matchedProfession, normalizedQuery);
      router.push(buildLocalizedSearchPath({
        categorySlug: slugifyProfession(professionValue),
        locale: routeLocale,
      }));
      return;
    }

    router.push(`${buildLocalizedSearchPath({ locale: routeLocale })}?q=${encodeURIComponent(normalizedQuery)}`);
  }

  function chooseProfession(profession) {
    const value = getProfessionSearchValue(profession, getProfessionLabel(profession, locale));
    router.push(buildLocalizedSearchPath({
      categorySlug: slugifyProfession(value),
      locale: routeLocale,
    }));
  }

  const matchedProfession = useMemo(() => (
    categorySlug ? findProfessionBySlug(professions, categorySlug) : null
  ), [categorySlug, professions]);
  const matchedProfessionLabel = matchedProfession
    ? getProfessionLabel(matchedProfession, locale)
    : '';
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
    searchGenerationRef.current += 1;
    searchCursorRef.current = null;
    lastSearchKeyRef.current = '';
    lastSearchProfessionRef.current = '';
    pendingSearchRef.current = '';
    setQuery('');
    setWorkers([]);
    setHasSearched(false);
    setHasMoreWorkers(false);
    setLoading(false);
    setLoadingMore(false);
    router.push(buildLocalizedSearchPath({ locale: routeLocale }));
    inputRef.current?.focus();
  }

  function useLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        toast.success('Location acquired!');
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
  const hasUserLocation = typeof userLat === 'number' && typeof userLng === 'number';
  const displayedWorkers = filterByWorkRadius && hasUserLocation
    ? sortedWorkers.filter((worker) => (
      typeof worker.distanceKm === 'number' &&
      typeof worker.workRadius === 'number' &&
      worker.distanceKm * 1000 <= worker.workRadius
    ))
    : sortedWorkers;
  const categoryProfession = initialProfession || matchedProfession;
  const categorySeo = categoryProfession
    ? getProfessionPageContent(categoryProfession, locale)
    : null;
  const currentProfessionIndex = categoryProfession
    ? professions.findIndex((item) => item.slug === categoryProfession.slug)
    : -1;
  const relatedProfessions = currentProfessionIndex >= 0
    ? professions
      .filter((_, index) => index !== currentProfessionIndex)
      .slice(Math.max(0, currentProfessionIndex - 3), Math.max(0, currentProfessionIndex - 3) + 6)
    : [];
  const searchSeo = getSearchPageSeo();
  const searchDisplayLabel = matchedProfessionLabel || query;
  const pageTitle = categorySeo?.title || (searchDisplayLabel ? `"${searchDisplayLabel}" – הירו` : searchSeo.title);
  const pageDescription = categorySeo?.description || searchSeo.description;

  return (
    <>
      {!categorySlug ? (
        <Head>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
        </Head>
      ) : null}

      <div
        className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl md:top-16"
        dir={dir}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-2">
          <div className="flex min-w-max flex-1 items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-sm shadow-slate-200/60">
          <form onSubmit={handleSubmit} className="flex min-w-[300px] flex-1 items-center gap-1.5">
            <div className="relative flex-1">
              <HiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="h-11 w-full rounded-xl border-0 bg-slate-50 pl-11 pr-10 text-sm font-medium text-gray-900 outline-none ring-1 ring-inset ring-slate-100 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/20"
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
                'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                userLat
                  ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200'
                  : 'bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-100 hover:bg-primary-50 hover:text-primary'
              )}
              aria-label={t.search.useLocation}
            >
              <HiLocationMarker className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={!query.trim()}
              className="btn-primary h-11 shrink-0 rounded-xl px-5 shadow-none disabled:opacity-50"
            >
              <HiSearch className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">{t.nav.search}</span>
            </button>
          </form>

          {hasSearched && !loading && (
            <div className="flex shrink-0 items-center gap-1.5 border-s border-slate-200 ps-1.5">
              <span
                className={clsx(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-extrabold',
                  displayedWorkers.length > 0 ? 'bg-primary-50 text-primary' : 'bg-slate-100 text-slate-400'
                )}
                title={displayedWorkers.length === 1
                  ? (typeof t.search.resultFor === 'function'
                    ? t.search.resultFor(searchDisplayLabel)
                    : `result for "${searchDisplayLabel}"`)
                  : (typeof t.search.resultsFor === 'function'
                    ? t.search.resultsFor(searchDisplayLabel)
                    : `results for "${searchDisplayLabel}"`)}
              >
                {displayedWorkers.length}
              </span>

                <button
                  type="button"
                  onClick={() => {
                    if (!filterByWorkRadius && !hasUserLocation) {
                      toast.error(t.search.workRadiusEnableLocation);
                      return;
                    }
                    setFilterByWorkRadius((current) => !current);
                  }}
                  className={clsx(
                    'relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 transition-colors',
                    filterByWorkRadius
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                  )}
                  aria-pressed={filterByWorkRadius}
                  title={hasUserLocation ? t.search.workRadiusSubtitle : t.search.workRadiusNeedsLocation}
                >
                  <HiSwitchHorizontal className="h-4 w-4" />
                  <span className="hidden whitespace-nowrap text-[11px] font-bold sm:inline">
                    {t.search.workRadiusShort || t.search.workRadiusTitle}
                  </span>
                  <span className={clsx(
                    'absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-white',
                    filterByWorkRadius ? 'bg-amber-500' : 'bg-slate-300'
                  )} />
                </button>

                <div className="flex h-9 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
                <div className="flex flex-1 flex-wrap items-center gap-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => changeSort(option.value)}
                      className={clsx(
                        'rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-200',
                        sortBy === option.value
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5" dir={dir}>
        {categoryProfession ? (
          <ProfessionHero profession={categoryProfession} locale={locale} />
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

            {filteredProfessions.length === 0 ? (
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

        <section id="profession-results" aria-label={categorySeo?.results || searchDisplayLabel}>
        {categoryProfession ? (
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-slate-950">
            {categorySeo.results}
          </h2>
        ) : null}

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

        {!loading && hasSearched && hasMoreWorkers && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMoreWorkers}
              disabled={loadingMore}
              className="inline-flex min-w-40 items-center justify-center rounded-2xl border border-primary/20 bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm transition hover:border-primary/40 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            >
              {loadingMore ? 'Loading more...' : 'Load more professionals'}
            </button>
          </div>
        )}

        {!loading && hasSearched && displayedWorkers.length === 0 && !hasMoreWorkers && (
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
        </section>

        {categoryProfession ? (
          <ProfessionSeoSections
            profession={categoryProfession}
            locale={locale}
            relatedProfessions={relatedProfessions}
          />
        ) : null}
      </div>
    </>
  );
}

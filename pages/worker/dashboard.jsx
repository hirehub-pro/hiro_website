import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import {
  HiBriefcase, 
  HiStar,      
  HiEye,       
  HiChartBar,  
  HiSparkles,  
  HiTrendingUp,
  HiLightBulb, 
  HiChevronDown,
} from 'react-icons/hi';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/firebase';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const EMPTY_WEEKLY_VIEWS = DAY_KEYS.reduce((acc, key) => {
  acc[key] = 0;
  return acc;
}, {});

function localeToIntl(locale) {
  if (locale === 'he') return 'he-IL';
  if (locale === 'ar') return 'ar';
  return 'en-US';
}

function formatCurrency(value, locale) {
  const safeValue = Number(value) || 0;
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function formatEarnings(value, locale, emptyLabel) {
  const safeValue = Number(value) || 0;
  return safeValue > 0 ? formatCurrency(safeValue, locale) : emptyLabel;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

function clampScore(value) {
  const safeValue = Number(value) || 0;
  return Math.max(0, Math.min(5, safeValue));
}

function safeNumber(value) {
  return Number(value) || 0;
}

function average(values) {
  const validValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function weightedAverage(items, averageKey) {
  const totals = items.reduce((acc, item) => {
    const count = safeNumber(item.reviewCount);
    const value = safeNumber(item[averageKey]);
    if (count > 0 && value > 0) {
      acc.sum += value * count;
      acc.count += count;
    }
    return acc;
  }, { sum: 0, count: 0 });

  return totals.count > 0 ? totals.sum / totals.count : 0;
}

function getReviewServiceRating(review) {
  return safeNumber(review.serviceRating) || safeNumber(review.professionalismRating);
}

function getReviewWorkQualityRating(review) {
  return safeNumber(review.workQualityRating) || safeNumber(review.workRating);
}

function getReviewAverages(reviews) {
  return {
    overall: average(reviews.map((review) => review.rating)),
    price: average(reviews.map((review) => review.priceRating)),
    service: average(reviews.map(getReviewServiceRating)),
    timing: average(reviews.map((review) => review.timingRating)),
    workQuality: average(reviews.map(getReviewWorkQualityRating)),
  };
}

function sumWeeklyViews(shards) {
  return shards.reduce((acc, shard) => {
    DAY_KEYS.forEach((dayKey) => {
      acc[dayKey] += safeNumber(shard[dayKey]);
    });
    return acc;
  }, { ...EMPTY_WEEKLY_VIEWS });
}

function getWeekTotal(weeklyViews) {
  return DAY_KEYS.reduce((sum, dayKey) => sum + safeNumber(weeklyViews[dayKey]), 0);
}

function mergeWeeklyViews(items) {
  return items.reduce((acc, item) => {
    DAY_KEYS.forEach((dayKey) => {
      acc[dayKey] += safeNumber(item.weeklyViews?.[dayKey]);
    });
    return acc;
  }, { ...EMPTY_WEEKLY_VIEWS });
}

function uniqueProfessionOptions(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((value, index) => ({
      id: `${value}-${index}`,
      label: value,
      value,
    }));
}

function getBestProfession(stats) {
  return stats
    .filter((item) => item.profession)
    .sort((a, b) => (
      safeNumber(b.avgOverallRating) - safeNumber(a.avgOverallRating)
      || safeNumber(b.reviewCount) - safeNumber(a.reviewCount)
    ))[0]?.profession || '';
}

function getGrowthRecommendation({ views, jobs, conversionRate, rating }, copy) {
  if (views === 0 && jobs === 0) return copy.analyticsRecommendationEmpty;
  if (views < 20) return copy.analyticsRecommendationLowVisibility;
  if (conversionRate < 8) return copy.analyticsRecommendationLowConversion;
  if (rating > 0 && rating < 4.3) return copy.analyticsRecommendationLowRating;
  return copy.analyticsRecommendationStable;
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, profile, isWorker, loading } = useAuth();
  const routeWorkerId = useMemo(() => (
    String(router.query.workerId || router.query.uid || '').trim()
  ), [router.query.workerId, router.query.uid]);

  const [analytics, setAnalytics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [professionMenuOpen, setProfessionMenuOpen] = useState(false);
  const [selectedProfessionValue, setSelectedProfessionValue] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!loading && !user && !routeWorkerId) {
      router.replace('/auth/signin');
      return;
    }

    if (!loading && user && !isWorker && !routeWorkerId) {
      router.replace('/');
      return;
    }

    const loadStats = async () => {
      const workerId = routeWorkerId || user?.uid;
      if (!workerId) return;

      try {
        setLoadingStats(true);
        const [
          profileSnap,
          earningsSnap,
          reviewsSnap,
          proRatingSnap,
        ] = await Promise.all([
          getDoc(doc(db, 'publicWorkerProfiles', workerId)),
          getDoc(doc(db, 'users', workerId, 'metadata', 'financial_summary')),
          getDocs(collection(db, 'publicWorkerProfiles', workerId, 'reviews')),
          getDocs(collection(db, 'users', workerId, 'ProRating')),
        ]);

        const workerProfile = profileSnap.exists() ? profileSnap.data() : {};
        const earnings = earningsSnap.exists() ? earningsSnap.data() : {};
        const reviews = reviewsSnap.docs.map((reviewDoc) => reviewDoc.data() || {});

        const professionStats = await Promise.all(proRatingSnap.docs.map(async (ratingDoc) => {
          const data = ratingDoc.data() || {};
          const shardsSnap = await getDocs(collection(
            db,
            'users',
            workerId,
            'ProRating',
            ratingDoc.id,
            'VPD',
            'currentWeek',
            'shards'
          ));
          const weeklyViews = sumWeeklyViews(shardsSnap.docs.map((shardDoc) => shardDoc.data() || {}));
          const reviewCount = safeNumber(data.reviewCount);

          return {
            id: ratingDoc.id,
            profession: String(data.profession || ratingDoc.id || '').replaceAll('_', '/').trim(),
            totalViews: safeNumber(data.totalViews),
            reviewCount,
            avgOverallRating: safeNumber(data.avgOverallRating) || (reviewCount > 0 ? safeNumber(data.totalStars) / reviewCount : 0),
            avgPriceRating: safeNumber(data.avgPriceRating) || (reviewCount > 0 ? safeNumber(data.totalPriceStars) / reviewCount : 0),
            avgServiceRating: safeNumber(data.avgServiceRating) || (reviewCount > 0 ? safeNumber(data.totalServiceStars) / reviewCount : 0),
            avgTimingRating: safeNumber(data.avgTimingRating) || (reviewCount > 0 ? safeNumber(data.totalTimingStars) / reviewCount : 0),
            avgWorkQualityRating: safeNumber(data.avgWorkQualityRating) || (reviewCount > 0 ? safeNumber(data.totalWorkQualityStars) / reviewCount : 0),
            weeklyViews,
          };
        }));

        const profileProfessions = Array.isArray(workerProfile.professions)
          ? workerProfile.professions
          : [];
        const options = uniqueProfessionOptions([
          ...professionStats.map((item) => item.profession),
          ...profileProfessions,
          workerProfile.profession,
        ]);

        setAnalytics({
          workerProfile,
          totalEarned: safeNumber(earnings.totalEarned),
          reviews,
          professionStats,
          professionOptions: options,
        });
      } catch (error) {
        setAnalytics({
          workerProfile: profile || {},
          totalEarned: 0,
          reviews: [],
          professionStats: [],
          professionOptions: uniqueProfessionOptions([
            ...(Array.isArray(profile?.professions) ? profile.professions : []),
            profile?.profession,
          ]),
        });
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [loading, user, isWorker, router, router.isReady, routeWorkerId, profile]);

  const professionOptions = analytics?.professionOptions || [];

  const dashboardStats = useMemo(() => {
    const workerProfile = analytics?.workerProfile || {};
    const reviews = analytics?.reviews || [];
    const professionStats = analytics?.professionStats || [];
    const selectedStat = professionStats.find((item) => item.profession === selectedProfessionValue);
    const selectedReviews = selectedProfessionValue
      ? reviews.filter((review) => String(review.profession || '').trim() === selectedProfessionValue)
      : reviews;
    const reviewAverages = getReviewAverages(selectedReviews);
    const allReviewAverages = getReviewAverages(reviews);
    const allWeeklyViews = mergeWeeklyViews(professionStats);
    const selectedWeeklyViews = selectedStat?.weeklyViews || { ...EMPTY_WEEKLY_VIEWS };
    const weeklyViews = selectedProfessionValue ? selectedWeeklyViews : allWeeklyViews;

    const jobs = safeNumber(workerProfile.totalJobs) || reviews.length;
    const views = selectedProfessionValue
      ? safeNumber(selectedStat?.totalViews)
      : professionStats.reduce((sum, item) => sum + safeNumber(item.totalViews), 0);
    const rating = selectedProfessionValue
      ? safeNumber(selectedStat?.avgOverallRating) || reviewAverages.overall || safeNumber(workerProfile.avgRating)
      : weightedAverage(professionStats, 'avgOverallRating') || allReviewAverages.overall || safeNumber(workerProfile.avgRating);
    const conversionRate = views > 0 ? (jobs / views) * 100 : 0;

    const quality = {
      price: clampScore(selectedProfessionValue
        ? safeNumber(selectedStat?.avgPriceRating) || reviewAverages.price
        : weightedAverage(professionStats, 'avgPriceRating') || allReviewAverages.price),
      service: clampScore(selectedProfessionValue
        ? safeNumber(selectedStat?.avgServiceRating) || reviewAverages.service
        : weightedAverage(professionStats, 'avgServiceRating') || allReviewAverages.service),
      workQuality: clampScore(selectedProfessionValue
        ? safeNumber(selectedStat?.avgWorkQualityRating) || reviewAverages.workQuality
        : weightedAverage(professionStats, 'avgWorkQualityRating') || allReviewAverages.workQuality),
      timing: clampScore(selectedProfessionValue
        ? safeNumber(selectedStat?.avgTimingRating) || reviewAverages.timing
        : weightedAverage(professionStats, 'avgTimingRating') || allReviewAverages.timing),
    };
    const topSkill = getBestProfession(professionStats) || workerProfile.profession || workerProfile.professions?.[0] || t.dashboard.noSkill;
    const selectedProfessionLabel = selectedProfessionValue || (professionOptions.length > 0 ? t.dashboard.allProfessions : t.dashboard.noSkill);
    const viewsThisWeek = getWeekTotal(weeklyViews);
    const recommendation = getGrowthRecommendation({ views, jobs, conversionRate, rating }, t.dashboard);

    return {
      estimatedEarnings: analytics?.totalEarned || 0,
      jobs,
      rating,
      views,
      viewsThisWeek,
      topSkill,
      selectedProfessionLabel,
      showProfessionDropdown: professionOptions.length > 0,
      conversionRate,
      quality,
      weeklyViews,
      recommendation,
    };
  }, [analytics, professionOptions.length, selectedProfessionValue, t.dashboard]);

  const trendBars = useMemo(() => {
    const maxValue = Math.max(...DAY_KEYS.map((dayKey) => safeNumber(dashboardStats.weeklyViews?.[dayKey])), 0);

    return DAY_KEYS.map((dayKey) => {
      const value = safeNumber(dashboardStats.weeklyViews?.[dayKey]);
      return maxValue > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 8;
    });
  }, [dashboardStats.weeklyViews]);

  if (!router.isReady || loading || loadingStats) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && !routeWorkerId) return null;

  if (!isWorker && !routeWorkerId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-soft">
          <p className="text-sm font-semibold text-gray-700">{t.dashboard.workerOnly}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`Hiro | ${t.dashboard.title}`}</title>
      </Head>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <h1 className="mb-5 text-2xl font-extrabold text-gray-900">{t.dashboard.title}</h1>

        <section className="rounded-[28px] bg-gradient-to-br from-[#101B3A] via-[#112A5B] to-[#0E1B3A] p-5 text-white shadow-2xl shadow-blue-900/20 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-100/90">{t.dashboard.estimatedEarnings}</p>
            <div className="rounded-xl bg-white/10 p-2">
              <HiChartBar className="h-5 w-5 text-blue-100" />
            </div>
          </div>

          <p className="mb-4 text-4xl font-extrabold tracking-tight">
            {formatEarnings(dashboardStats.estimatedEarnings, locale, t.dashboard.noEarnings)}
          </p>

          <div className="mb-6 flex items-center gap-2 text-blue-100/90">
            <HiEye className="h-5 w-5" />
            <span className="text-sm font-semibold">{t.dashboard.viewsThisWeek}: {dashboardStats.viewsThisWeek}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4 text-center">
            <div>
              <div className="mb-1 flex items-center justify-center gap-1 text-blue-200/90">
                <HiBriefcase className="h-4 w-4" />
                <span className="text-xs font-semibold">{t.dashboard.jobs}</span>
              </div>
              <p className="text-2xl font-bold">{dashboardStats.jobs}</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-center gap-1 text-blue-200/90">
                <HiStar className="h-4 w-4" />
                <span className="text-xs font-semibold">{t.dashboard.rating}</span>
              </div>
              <p className="text-2xl font-bold">{dashboardStats.rating.toFixed(1)}</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-center gap-1 text-blue-200/90">
                <HiEye className="h-4 w-4" />
                <span className="text-xs font-semibold">{t.dashboard.views}</span>
              </div>
              <p className="text-2xl font-bold">{dashboardStats.views}</p>
            </div>
          </div>
        </section>

        {dashboardStats.showProfessionDropdown && (
          <section className="relative z-10 mt-5">
            <button
              type="button"
              onClick={() => setProfessionMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-[28px] border border-slate-100 bg-white px-5 py-7 text-start shadow-soft md:px-7"
              aria-expanded={professionMenuOpen}
            >
              <span className="line-clamp-1 text-xl font-extrabold text-gray-900">{dashboardStats.selectedProfessionLabel}</span>
              <HiChevronDown
                className={clsx(
                  'h-6 w-6 shrink-0 text-gray-500 transition-transform',
                  professionMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {professionMenuOpen && (
              <div className="absolute inset-x-0 top-full z-20 overflow-hidden rounded-b-2xl bg-white shadow-2xl shadow-slate-900/20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfessionValue('');
                    setProfessionMenuOpen(false);
                  }}
                  className={clsx(
                    'block w-full px-5 py-5 text-start text-xl font-extrabold md:px-7',
                    !selectedProfessionValue ? 'bg-gray-200 text-gray-950' : 'text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {t.dashboard.allProfessions}
                </button>
                <div className="max-h-80 overflow-y-auto">
                  {professionOptions.map((item) => {
                    const active = item.value === selectedProfessionValue;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedProfessionValue(item.value);
                          setProfessionMenuOpen(false);
                        }}
                        className={clsx(
                          'block w-full px-5 py-5 text-start text-xl font-extrabold md:px-7',
                          active ? 'bg-gray-200 text-gray-950' : 'text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="mb-3 inline-flex rounded-2xl bg-teal-50 p-2 text-teal-600">
              <HiTrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-500">{t.dashboard.conversion}</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900">{formatPercent(dashboardStats.conversionRate)}</p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="mb-3 inline-flex rounded-2xl bg-indigo-50 p-2 text-indigo-600">
              <HiSparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-500">{t.dashboard.topSkill}</p>
            <p className="mt-1 line-clamp-1 text-xl font-extrabold text-gray-900">{dashboardStats.topSkill}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-extrabold text-gray-900">{t.dashboard.profileReach}</h2>
          <div className="mt-6 flex h-36 items-end justify-between gap-3 rounded-2xl bg-amber-50/40 px-4 py-3">
            {trendBars.map((height, index) => (
              <div
                key={index}
                className="w-full rounded-full bg-gradient-to-t from-amber-500 to-amber-300"
                style={{ height: `${Math.max(20, Math.round((height / 100) * 90))}%` }}
              />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-extrabold text-gray-900">{t.dashboard.serviceQuality}</h2>

          <div className="mt-5 space-y-4">
            {[
              { label: t.dashboard.price, value: dashboardStats.quality.price, color: 'from-amber-300 to-amber-500' },
              { label: t.dashboard.service, value: dashboardStats.quality.service, color: 'from-blue-300 to-blue-500' },
              { label: t.dashboard.workQuality, value: dashboardStats.quality.workQuality, color: 'from-violet-300 to-violet-500' },
              { label: t.dashboard.timing, value: dashboardStats.quality.timing, color: 'from-emerald-300 to-emerald-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>{row.label}</span>
                  <span className="text-gray-500">{row.value.toFixed(1)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100">
                  <div
                    className={clsx('h-full rounded-full bg-gradient-to-r', row.color)}
                    style={{ width: `${(row.value / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-hero-gradient p-6 text-white shadow-glow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-2xl bg-white/20 p-2.5">
              <HiLightBulb className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold">{t.dashboard.growthRecommendation}</h3>
              <p className="mt-2 max-w-2xl text-sm text-white/85">{dashboardStats.recommendation}</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

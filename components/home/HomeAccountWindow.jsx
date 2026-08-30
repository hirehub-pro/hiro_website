import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import clsx from 'clsx';
import {
  HiArrowNarrowLeft,
  HiBriefcase,
  HiChartBar,
  HiClipboardList,
  HiEye,
  HiLightBulb,
  HiLockClosed,
  HiStar,
  HiTrendingUp,
} from 'react-icons/hi';
import { FiCalendar, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/firebase';
import {
  formatRequestDateTime,
  getRequestStatusClass,
  isPendingRequestExpired,
  isWorkRequest,
  normalizeRequestDocument,
} from '../../lib/request-utils';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const EMPTY_WEEKLY_VIEWS = DAY_KEYS.reduce((result, day) => ({ ...result, [day]: 0 }), {});

function safeNumber(value) {
  return Number(value) || 0;
}

function average(values) {
  const validValues = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return validValues.length > 0
    ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
    : 0;
}

function sumWeeklyViews(shards) {
  return shards.reduce((totals, shard) => {
    DAY_KEYS.forEach((day) => {
      totals[day] += safeNumber(shard?.[day]);
    });
    return totals;
  }, { ...EMPTY_WEEKLY_VIEWS });
}

function mergeWeeklyViews(items) {
  return items.reduce((totals, item) => {
    DAY_KEYS.forEach((day) => {
      totals[day] += safeNumber(item.weeklyViews?.[day]);
    });
    return totals;
  }, { ...EMPTY_WEEKLY_VIEWS });
}

function weightedRating(items) {
  const totals = items.reduce((result, item) => {
    const count = safeNumber(item.reviewCount);
    const rating = safeNumber(item.avgOverallRating);
    if (count > 0 && rating > 0) {
      result.points += rating * count;
      result.count += count;
    }
    return result;
  }, { points: 0, count: 0 });

  return totals.count > 0 ? totals.points / totals.count : 0;
}

function getRecommendation({ views, jobs, conversionRate, rating }, copy) {
  if (views === 0 && jobs === 0) return copy.analyticsRecommendationEmpty;
  if (views < 20) return copy.analyticsRecommendationLowVisibility;
  if (conversionRate < 8) return copy.analyticsRecommendationLowConversion;
  if (rating > 0 && rating < 4.3) return copy.analyticsRecommendationLowRating;
  return copy.analyticsRecommendationStable;
}

function getDashboardSummary(analytics, copy) {
  const workerProfile = analytics?.workerProfile || {};
  const reviews = analytics?.reviews || [];
  const professionStats = analytics?.professionStats || [];
  const weeklyViews = mergeWeeklyViews(professionStats);
  const jobs = safeNumber(workerProfile.totalJobs) || reviews.length;
  const views = professionStats.reduce((sum, item) => sum + safeNumber(item.totalViews), 0);
  const rating = weightedRating(professionStats)
    || average(reviews.map((review) => review.rating))
    || safeNumber(workerProfile.avgRating);
  const conversionRate = views > 0 ? (jobs / views) * 100 : 0;
  const topSkill = [...professionStats]
    .filter((item) => item.profession)
    .sort((a, b) => (
      safeNumber(b.avgOverallRating) - safeNumber(a.avgOverallRating)
      || safeNumber(b.reviewCount) - safeNumber(a.reviewCount)
    ))[0]?.profession
    || workerProfile.profession
    || workerProfile.professions?.[0]
    || copy.noSkill;
  const viewsThisWeek = DAY_KEYS.reduce((sum, day) => sum + safeNumber(weeklyViews[day]), 0);

  return {
    estimatedEarnings: safeNumber(analytics?.totalEarned),
    jobs,
    rating,
    views,
    viewsThisWeek,
    conversionRate,
    topSkill,
    weeklyViews,
    recommendation: getRecommendation({ views, jobs, conversionRate, rating }, copy),
  };
}

function localeToIntl(locale) {
  if (locale === 'he') return 'he-IL';
  if (locale === 'ar') return 'ar';
  return 'en-US';
}

function formatEarnings(value, locale, emptyLabel) {
  if (safeNumber(value) <= 0) return emptyLabel;
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatsSkeleton() {
  return (
    <div className="grid animate-pulse gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-3xl bg-slate-100" />)}
    </div>
  );
}

function RequestsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1].map((item) => <div key={item} className="h-32 rounded-3xl bg-slate-100" />)}
    </div>
  );
}

function SignedOutWorkspace({ copy, dir }) {
  return (
    <section
      aria-labelledby="home-workspace-signed-out-title"
      className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-card"
      data-testid="home-account-window"
      dir={dir}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-5 py-5 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{copy.workspaceEyebrow}</p>
      </div>
      <div className="px-5 py-9 text-center sm:px-8 sm:py-11">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-50 text-primary ring-8 ring-primary-50/50">
          <HiLockClosed className="h-7 w-7" />
        </span>
        <h2 id="home-workspace-signed-out-title" className="mx-auto mt-6 max-w-xl text-2xl font-extrabold text-slate-950">
          {copy.workspaceSignedOutTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{copy.workspaceSignedOutBody}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/auth/signin?next=%2F" className="btn-primary inline-flex items-center justify-center px-8">
            {copy.workspaceSignInCta}
          </Link>
          <Link href="/auth/signup" className="btn-ghost inline-flex items-center justify-center px-8">
            {copy.workspaceCreateAccountCta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomeAccountWindow() {
  const { user, profile, isWorker, loading } = useAuth();
  const { t, locale, dir } = useLanguage();
  const [activeView, setActiveView] = useState('statistics');
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    setActiveView(isWorker ? 'statistics' : 'requests');
  }, [isWorker]);

  useEffect(() => {
    if (!user?.uid || !profile?.role) return undefined;
    let cancelled = false;

    async function loadRequests() {
      setLoadingRequests(true);
      setRequestsError('');

      try {
        const collectionName = isWorker ? 'RequestToMe' : 'requests';
        const snapshot = await getDocs(collection(db, 'users', user.uid, collectionName));
        if (cancelled) return;

        const items = snapshot.docs
          .map((requestDoc) => normalizeRequestDocument(requestDoc.id, requestDoc.data()))
          .filter((request) => request.type === 'work_request')
          .filter((request) => (isWorker ? request.workerId === user.uid : request.fromId === user.uid))
          .map((request) => (isPendingRequestExpired(request) ? { ...request, status: 'expired' } : request))
          .sort((a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0));

        setRequests(items);
      } catch (error) {
        if (!cancelled) setRequestsError(t.home.workspaceRequestsError);
      } finally {
        if (!cancelled) setLoadingRequests(false);
      }
    }

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, [isWorker, profile?.role, t.home.workspaceRequestsError, user?.uid]);

  useEffect(() => {
    if (!isWorker || !user?.uid) {
      setLoadingStats(false);
      return undefined;
    }

    let cancelled = false;

    async function loadStats() {
      setLoadingStats(true);
      setStatsError('');

      try {
        const [profileSnap, earningsSnap, reviewsSnap, proRatingSnap] = await Promise.all([
          getDoc(doc(db, 'publicWorkerProfiles', user.uid)),
          getDoc(doc(db, 'users', user.uid, 'metadata', 'financial_summary')),
          getDocs(collection(db, 'publicWorkerProfiles', user.uid, 'reviews')),
          getDocs(collection(db, 'users', user.uid, 'ProRating')),
        ]);

        const professionStats = await Promise.all(proRatingSnap.docs.map(async (ratingDoc) => {
          const data = ratingDoc.data() || {};
          const shardsSnap = await getDocs(collection(
            db,
            'users',
            user.uid,
            'ProRating',
            ratingDoc.id,
            'VPD',
            'currentWeek',
            'shards'
          ));
          const reviewCount = safeNumber(data.reviewCount);

          return {
            profession: String(data.profession || ratingDoc.id || '').replaceAll('_', '/').trim(),
            totalViews: safeNumber(data.totalViews),
            reviewCount,
            avgOverallRating: safeNumber(data.avgOverallRating)
              || (reviewCount > 0 ? safeNumber(data.totalStars) / reviewCount : 0),
            weeklyViews: sumWeeklyViews(shardsSnap.docs.map((shardDoc) => shardDoc.data() || {})),
          };
        }));

        if (cancelled) return;
        setAnalytics({
          workerProfile: profileSnap.exists() ? profileSnap.data() : profile || {},
          totalEarned: earningsSnap.exists() ? safeNumber(earningsSnap.data()?.totalEarned) : 0,
          reviews: reviewsSnap.docs.map((reviewDoc) => reviewDoc.data() || {}),
          professionStats,
        });
      } catch (error) {
        if (!cancelled) {
          setAnalytics({ workerProfile: profile || {}, totalEarned: 0, reviews: [], professionStats: [] });
          setStatsError(t.home.workspaceStatsError);
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [isWorker, profile, t.home.workspaceStatsError, user?.uid]);

  const stats = useMemo(() => getDashboardSummary(analytics, t.dashboard), [analytics, t.dashboard]);
  const trendBars = useMemo(() => {
    const maxValue = Math.max(...DAY_KEYS.map((day) => safeNumber(stats.weeklyViews?.[day])), 0);
    return DAY_KEYS.map((day) => {
      const value = safeNumber(stats.weeklyViews?.[day]);
      return maxValue > 0 ? Math.max(10, Math.round((value / maxValue) * 100)) : 10;
    });
  }, [stats.weeklyViews]);
  const requestStats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === 'pending').length,
    accepted: requests.filter((request) => request.status === 'accepted').length,
  }), [requests]);

  if (loading) return null;
  if (!user) return <SignedOutWorkspace copy={t.home} dir={dir} />;
  if (!profile?.role) return null;

  const requestMode = isWorker ? 'received' : 'sent';
  const latestRequests = requests.slice(0, 3);
  const emptyText = isWorker ? t.requests.noReceived : t.requests.noSent;

  return (
    <section
      aria-labelledby="home-workspace-title"
      className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-card"
      data-testid="home-account-window"
      dir={dir}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">{t.home.workspaceEyebrow}</p>
            <h2 id="home-workspace-title" className="mt-1 text-2xl font-extrabold text-slate-950">
              {activeView === 'statistics' ? t.home.workspaceStatsTitle : t.home.workspaceRequestsTitle}
            </h2>
          </div>

          {isWorker ? (
            <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label={t.home.workspaceTabsLabel}>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'statistics'}
                onClick={() => setActiveView('statistics')}
                className={clsx(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition',
                  activeView === 'statistics' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'
                )}
              >
                <HiChartBar className="h-5 w-5" />
                {t.home.workspaceStatsTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'requests'}
                onClick={() => setActiveView('requests')}
                className={clsx(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition',
                  activeView === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'
                )}
              >
                <HiClipboardList className="h-5 w-5" />
                {t.home.workspaceRequestsTab}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeView === 'statistics' && isWorker ? (
          loadingStats ? <StatsSkeleton /> : (
            <div>
              {statsError ? <p className="mb-4 text-sm font-semibold text-amber-700">{statsError}</p> : null}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { icon: HiBriefcase, label: t.dashboard.jobs, value: stats.jobs, tone: 'bg-violet-50 text-violet-700' },
                  { icon: HiStar, label: t.dashboard.rating, value: stats.rating.toFixed(1), tone: 'bg-amber-50 text-amber-700' },
                  { icon: HiEye, label: t.dashboard.views, value: stats.views, tone: 'bg-sky-50 text-sky-700' },
                  { icon: HiTrendingUp, label: t.dashboard.viewsThisWeek, value: stats.viewsThisWeek, tone: 'bg-emerald-50 text-emerald-700' },
                ].map(({ icon: Icon, label, value, tone }) => (
                  <article key={label} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <span className={clsx('inline-flex h-9 w-9 items-center justify-center rounded-2xl', tone)}><Icon className="h-5 w-5" /></span>
                    <p className="mt-3 text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-[28px] bg-slate-950 p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">{t.dashboard.estimatedEarnings}</p>
                      <p className="mt-1 text-2xl font-extrabold">{formatEarnings(stats.estimatedEarnings, locale, t.dashboard.noEarnings)}</p>
                    </div>
                    <p className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-sky-300">{stats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="mt-5 flex h-20 items-end gap-2" aria-label={t.dashboard.profileReach}>
                    {trendBars.map((height, index) => (
                      <span key={DAY_KEYS[index]} className="w-full rounded-full bg-gradient-to-t from-primary to-sky-300" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </article>

                <article className="rounded-[28px] border border-sky-100 bg-sky-50 p-5">
                  <HiLightBulb className="h-6 w-6 text-primary" />
                  <p className="mt-3 text-xs font-semibold text-slate-500">{t.dashboard.topSkill}</p>
                  <p className="mt-1 text-lg font-extrabold text-slate-950">{stats.topSkill}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-600">{stats.recommendation}</p>
                </article>
              </div>

              <Link href="/worker/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">
                {t.home.workspaceOpenDashboard}<HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          )
        ) : (
          <div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: t.requests.total, value: requestStats.total, tone: 'bg-slate-50 text-slate-950' },
                { label: t.requests.pending, value: requestStats.pending, tone: 'bg-amber-50 text-amber-800' },
                { label: t.requests.accepted, value: requestStats.accepted, tone: 'bg-emerald-50 text-emerald-800' },
              ].map(({ label, value, tone }) => (
                <div key={label} className={clsx('rounded-2xl p-3 text-center', tone)}>
                  <p className="text-[11px] font-semibold opacity-70">{label}</p>
                  <p className="mt-0.5 text-xl font-extrabold">{value}</p>
                </div>
              ))}
            </div>

            {loadingRequests ? <RequestsSkeleton /> : requestsError ? (
              <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-600">{requestsError}</div>
            ) : latestRequests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <HiClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">{emptyText}</p>
                {!isWorker ? <Link href="/search" className="btn-primary mt-4 inline-flex">{t.requests.findProfessional}</Link> : null}
              </div>
            ) : (
              <div className="space-y-3">
                {latestRequests.map((request) => {
                  const otherName = isWorker ? request.fromName : request.workerName;
                  const requestHref = `/requests/${encodeURIComponent(request.requestId)}?tab=${requestMode}`;
                  return (
                    <Link key={request.requestId} href={requestHref} className="block rounded-[26px] border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-950">{isWorkRequest(request) ? t.requests.workRequest : request.title}</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{isWorker ? t.requests.from : t.requests.to} {otherName}</p>
                        </div>
                        <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', getRequestStatusClass(request.status))}>
                          {t.requests[request.status] || request.status}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{request.jobDescription || request.body || t.requests.noDescription}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                        {request.timestamp ? <span>{formatRequestDateTime(request.timestamp, locale)}</span> : null}
                        <span className="inline-flex items-center gap-1"><FiCalendar className="text-primary" />{request.date || t.requests.noDate}</span>
                        <span className="inline-flex min-w-0 items-center gap-1"><FiMapPin className="shrink-0 text-primary" /><span className="truncate">{request.locationName || t.requests.noLocation}</span></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link href={`/requests?tab=${requestMode}`} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline">
              {t.home.workspaceOpenRequests}<HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

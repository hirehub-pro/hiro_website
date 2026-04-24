import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  HiBriefcase,
  HiStar,
  HiEye,
  HiChartBar,
  HiSparkles,
  HiTrendingUp,
  HiLightBulb,
} from 'react-icons/hi';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getWorkerProjects, getWorkerReviews } from '../../lib/firestore';

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

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

function clampScore(value) {
  const safeValue = Number(value) || 0;
  return Math.max(0, Math.min(5, safeValue));
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, profile, isWorker, loading } = useAuth();

  const [projectsCount, setProjectsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
      return;
    }

    if (!loading && user && !isWorker) {
      router.replace('/');
      return;
    }

    const loadStats = async () => {
      if (!user || !isWorker) return;

      try {
        setLoadingStats(true);
        const [projects, reviews] = await Promise.all([
          getWorkerProjects(user.uid),
          getWorkerReviews(user.uid),
        ]);

        const trustedReviewCount = Array.isArray(reviews) ? reviews.length : 0;
        const bestCount = Math.max(profile?.reviewCount || 0, trustedReviewCount);

        setProjectsCount(Array.isArray(projects) ? projects.length : 0);

        if (!profile?.reviewCount || profile.reviewCount !== bestCount) {
          // Keep local analytics responsive even when worker profile is stale.
          // Persisting can be added later if needed.
        }
      } catch (error) {
        setProjectsCount(0);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [loading, user, isWorker, router, profile?.reviewCount]);

  const dashboardStats = useMemo(() => {
    const views = Number(profile?.viewCount ?? profile?.profileViews ?? 0) || 0;
    const jobs = projectsCount;
    const rating = Number(profile?.avgRating ?? 0) || 0;
    const topSkill = profile?.professions?.[0] || t.dashboard.noSkill;
    const conversionRate = views > 0 ? (jobs / views) * 100 : 0;

    const estimatedEarnings = Number(profile?.estimatedEarnings ?? 0) || 0;

    const qualitySource = profile?.serviceQuality || {};
    const quality = {
      price: clampScore(qualitySource.price),
      service: clampScore(qualitySource.service),
      timing: clampScore(qualitySource.timing),
    };

    return {
      estimatedEarnings,
      jobs,
      rating,
      views,
      topSkill,
      conversionRate,
      quality,
    };
  }, [profile, projectsCount, t.dashboard.noSkill]);

  const trendBars = useMemo(() => {
    const source = Array.isArray(profile?.weeklyTrend) ? profile.weeklyTrend.slice(0, 7) : [];
    const normalized = Array.from({ length: 7 }).map((_, index) => {
      const value = Number(source[index] ?? 0) || 0;
      return Math.max(8, Math.min(100, value));
    });

    return normalized;
  }, [profile?.weeklyTrend]);

  if (loading || loadingStats) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (!isWorker) {
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
        <title>{`HireHub | ${t.dashboard.title}`}</title>
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

          <p className="mb-6 text-4xl font-extrabold tracking-tight">{formatCurrency(dashboardStats.estimatedEarnings, locale)}</p>

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
          <h2 className="text-xl font-extrabold text-gray-900">{t.dashboard.earningsTrend}</h2>
          <div className="mt-6 flex h-40 items-end justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-4">
            {trendBars.map((height, index) => (
              <div
                key={index}
                className="w-full rounded-full bg-gradient-to-t from-blue-500 to-blue-300"
                style={{ height: `${height}%` }}
              />
            ))}
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
              <p className="mt-2 max-w-2xl text-sm text-white/85">{t.dashboard.recommendation}</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

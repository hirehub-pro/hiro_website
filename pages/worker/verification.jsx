import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheckSquare,
  FiCreditCard,
  FiFileText,
  FiMapPin,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getUserVerificationInfo,
  saveUserVerificationInfo,
} from '../../lib/firestore';

function StepBadge({ value }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-lg shadow-primary/20">
      {value}
    </div>
  );
}

function SectionTitle({ step, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <StepBadge value={step} />
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <section className={clsx('rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-card backdrop-blur sm:p-7', className)}>
      {children}
    </section>
  );
}

function DealerOption({ active, icon: Icon, title, description, selectedLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group relative min-h-[180px] rounded-[28px] border p-5 text-left transition-all',
        active
          ? 'border-primary bg-primary-50 shadow-lg shadow-primary/10'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card'
      )}
    >
      <div className={clsx(
        'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl',
        active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
      )}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className={clsx('text-2xl font-extrabold tracking-tight', active ? 'text-primary-dark' : 'text-slate-900')}>{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {active ? <div className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">{selectedLabel}</div> : null}
    </button>
  );
}

function ConfirmationRow({ checked, label, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-4 rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-primary/30 hover:bg-slate-50"
    >
      <div className={clsx(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-colors',
        checked ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-transparent'
      )}>
        <FiCheckSquare className="h-4 w-4" />
      </div>
      <span className="text-base leading-7 text-slate-700">{label}</span>
    </button>
  );
}

export default function WorkerVerificationPage() {
  const router = useRouter();
  const { user, profile, isWorker, loading, setProfile } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.businessVerification;
  const isRtl = dir === 'rtl';
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [address, setAddress] = useState('');
  const [dealerType, setDealerType] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [accuracyAccepted, setAccuracyAccepted] = useState(false);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/worker/verification')}`);
      return;
    }

    if (!loading && user && !isWorker) {
      router.replace('/');
    }
  }, [isWorker, loading, router, user]);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadVerification() {
      setLoadingVerification(true);

      try {
        const verification = await getUserVerificationInfo(user.uid);
        if (cancelled) return;

        setBusinessName(verification?.businessName || profile?.name || '');
        setBusinessId(verification?.businessId || '');
        setAddress(verification?.address || profile?.town || profile?.city || '');
        setDealerType(verification?.dealerType || String(profile?.dealerType || '').trim().toLowerCase());
        setLegalAccepted(verification?.legalAccepted === true);
        setAccuracyAccepted(verification?.accuracyAccepted === true);
        setResponsibilityAccepted(verification?.responsibilityAccepted === true);
      } catch (error) {
        if (!cancelled) {
          setBusinessName(profile?.name || '');
          setAddress(profile?.town || profile?.city || '');
        }
      } finally {
        if (!cancelled) {
          setLoadingVerification(false);
        }
      }
    }

    loadVerification();

    return () => {
      cancelled = true;
    };
  }, [profile?.city, profile?.dealerType, profile?.name, profile?.town, user?.uid]);

  const dealerOptions = useMemo(() => ([
    {
      value: 'exempt',
      title: copy.exemptTitle,
      description: copy.exemptDescription,
      icon: FiShield,
    },
    {
      value: 'licensed',
      title: copy.licensedTitle,
      description: copy.licensedDescription,
      icon: FiCreditCard,
    },
    {
      value: 'company',
      title: copy.companyTitle,
      description: copy.companyDescription,
      icon: FiBriefcase,
    },
  ]), [copy.companyDescription, copy.companyTitle, copy.exemptDescription, copy.exemptTitle, copy.licensedDescription, copy.licensedTitle]);

  const allConfirmationsAccepted = legalAccepted && accuracyAccepted && responsibilityAccepted;

  if (loading || (user && loadingVerification)) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !isWorker) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!businessName.trim() || !businessId.trim() || !address.trim() || !dealerType) {
      toast.error(copy.missingFields);
      return;
    }

    if (!allConfirmationsAccepted) {
      toast.error(copy.confirmationsRequired);
      return;
    }

    setSaving(true);

    try {
      await saveUserVerificationInfo(user.uid, {
        address,
        businessId,
        businessName,
        dealerType,
        legalAccepted,
        accuracyAccepted,
        responsibilityAccepted,
        status: 'pending',
      });

      setProfile((current) => (current ? {
        ...current,
        businessVerificationStatus: 'pending',
        dealerType,
      } : current));

      toast.success(copy.savedSuccess);

      const nextPath = typeof router.query.next === 'string' ? router.query.next : '';
      if (nextPath) {
        router.push(nextPath);
        return;
      }

      router.push(`/profile/${user.uid}`);
    } catch (error) {
      toast.error(error?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`Hiro | ${copy.title}`}</title>
      </Head>

      <main className="relative overflow-hidden px-4 py-6 md:py-8" dir={dir}>
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute left-0 top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary/65">{copy.eyebrow}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">{copy.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push(`/profile/${user.uid}`))}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-card transition-transform hover:-translate-y-0.5"
              aria-label={t.common.back}
            >
              <FiArrowLeft className={clsx('h-6 w-6', isRtl && 'rotate-180')} />
            </button>
          </div>

          <Card className="overflow-hidden bg-gradient-to-r from-primary to-sky-500 text-white">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{copy.heroBadge}</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{copy.heroTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">{copy.heroBody}</p>
              </div>
              <div className="rounded-[28px] bg-white/14 px-5 py-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{copy.statusLabel}</p>
                <p className="mt-2 text-lg font-bold">{copy.pendingStatus}</p>
              </div>
            </div>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <SectionTitle step="1" title={copy.sectionBusinessTitle} subtitle={copy.sectionBusinessSubtitle} />

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{copy.businessName}</span>
                  <div className="relative">
                    <FiBriefcase className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
                    <input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder={copy.businessNamePlaceholder}
                      className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{copy.businessId}</span>
                  <div className="relative">
                    <FiFileText className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
                    <input
                      value={businessId}
                      onChange={(event) => setBusinessId(event.target.value)}
                      placeholder={copy.businessIdPlaceholder}
                      className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{copy.address}</span>
                  <div className="relative">
                    <FiMapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder={copy.addressPlaceholder}
                      className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                    />
                  </div>
                </label>
              </div>
            </Card>

            <Card>
              <SectionTitle step="2" title={copy.sectionDealerTitle} subtitle={copy.sectionDealerSubtitle} />

              <div className="grid gap-4 md:grid-cols-3">
                {dealerOptions.map((option) => (
                  <DealerOption
                    key={option.value}
                    active={dealerType === option.value}
                    icon={option.icon}
                    title={option.title}
                    description={option.description}
                    selectedLabel={copy.selected}
                    onClick={() => setDealerType(option.value)}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle step="3" title={copy.sectionLegalTitle} subtitle={copy.sectionLegalSubtitle} />

              <div className="space-y-4">
                <ConfirmationRow
                  checked={legalAccepted}
                  label={copy.legalConfirmation}
                  onToggle={() => setLegalAccepted((current) => !current)}
                />
                <ConfirmationRow
                  checked={accuracyAccepted}
                  label={copy.accuracyConfirmation}
                  onToggle={() => setAccuracyAccepted((current) => !current)}
                />
                <ConfirmationRow
                  checked={responsibilityAccepted}
                  label={copy.responsibilityConfirmation}
                  onToggle={() => setResponsibilityAccepted((current) => !current)}
                />
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-500">{copy.footerNote}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={`/profile/${user.uid}`} className="btn-ghost text-center">
                  {t.common.cancel}
                </Link>
                <button type="submit" disabled={saving} className="btn-primary min-w-[240px] text-base font-bold">
                  {saving ? t.common.loading : copy.submit}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

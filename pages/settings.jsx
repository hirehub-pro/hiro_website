import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  FiAlertTriangle,
  FiArchive,
  FiBell,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiGlobe,
  FiHelpCircle,
  FiInfo,
  FiLock,
  FiLogOut,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import { db } from '../lib/firebase';
import { BkmvExportService } from '../lib/bkmvExportService';
import { registerForPushNotifications } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const notificationStorageKey = 'hiro_notifications_enabled';
const datePromptPattern = /^\d{4}-\d{2}-\d{2}$/;

function getAvatarFallback(name) {
  return String(name || 'H').trim().charAt(0).toUpperCase() || 'H';
}

function downloadBlobFile(file) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, logOut } = useAuth();
  const { t, locale, dir, changeLocale } = useLanguage();
  const copy = t.settings;
  const isRtl = dir === 'rtl';
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeInfoPanel, setActiveInfoPanel] = useState('');
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: true,
    from: '08:00',
    to: '16:00',
    weekdays: [1, 2, 3, 4, 5],
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [isGeneratingUniformFiles, setIsGeneratingUniformFiles] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings')}`);
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPreference = window.localStorage.getItem(notificationStorageKey);
    const browserGranted = 'Notification' in window && Notification.permission === 'granted';

    if (savedPreference === null) {
      setNotificationsEnabled(browserGranted);
      return;
    }

    setNotificationsEnabled(savedPreference === 'true' && browserGranted);
  }, []);

  useEffect(() => {
    const loadScheduleSettings = async () => {
      if (!user || profile?.role !== 'worker') return;

      try {
        const scheduleRef = doc(db, 'users', user.uid, 'Schedule', 'info');
        const scheduleSnap = await getDoc(scheduleRef);
        const data = scheduleSnap.exists() ? scheduleSnap.data() : {};

        setScheduleSettings({
          enabled: Boolean(data?.hideSchedule),
          from: data?.defaultWorkingHours?.from || '08:00',
          to: data?.defaultWorkingHours?.to || '16:00',
          weekdays: Array.isArray(data?.disabledDays)
            ? [1, 2, 3, 4, 5, 6, 7].filter((day) => !data.disabledDays.includes(day))
            : [1, 2, 3, 4, 5],
        });
      } catch (error) {
        console.error('Failed to load schedule settings:', error);
      }
    };

    loadScheduleSettings();
  }, [profile?.role, user]);

  const roleLabel = useMemo(() => {
    if (profile?.role === 'worker') return copy.roleWorker;
    if (profile?.role === 'admin') return copy.roleAdmin;
    return copy.roleCustomer;
  }, [copy.roleAdmin, copy.roleCustomer, copy.roleWorker, profile?.role]);

  const accountRows = [
    {
      key: 'account',
      label: copy.viewProfile,
      icon: FiUser,
      href: `/profile/${user?.uid || ''}`,
    },
    ...(profile?.role === 'worker' ? [{
      key: 'businessVerification',
      label: copy.businessVerification,
      icon: FiShield,
      href: '/worker/verification',
    }] : []),
    ...(user && !user.isAnonymous && profile?.role === 'worker' ? [{
      key: 'uniformFiles',
      label: copy.generateUniformFiles,
      subtitle: copy.generateUniformFilesSubtitle,
      icon: FiArchive,
      onClick: handleGenerateUniformFiles,
      disabled: isGeneratingUniformFiles,
    }] : []),
    {
      key: 'privacy',
      label: copy.privacyPolicy,
      icon: FiLock,
      onClick: () => setActiveInfoPanel('privacy'),
    },
    {
      key: 'terms',
      label: copy.termsOfService,
      icon: FiFileText,
      onClick: () => setActiveInfoPanel('terms'),
    },
  ];

  const supportRows = useMemo(() => ([
    {
      key: 'support',
      label: copy.helpSupport,
      icon: FiHelpCircle,
      href: '/contact',
    },
    {
      key: 'reports',
      label: copy.reports,
      icon: FiAlertTriangle,
      href: '/reports',
    },
    {
      key: 'about',
      label: copy.about,
      icon: FiInfo,
      onClick: () => setActiveInfoPanel('about'),
    },
  ]), [copy.about, copy.helpSupport, copy.reports]);

  const languageOptions = useMemo(() => ([
    { value: 'en', label: copy.english },
    { value: 'he', label: copy.hebrew },
    { value: 'ar', label: copy.arabic },
  ]), [copy.arabic, copy.english, copy.hebrew]);

  const infoPanelContent = {
    privacy: {
      title: copy.privacyPolicy,
      body: copy.privacyBody,
    },
    terms: {
      title: copy.termsOfService,
      body: copy.termsBody,
    },
    about: {
      title: copy.about,
      body: copy.aboutBody,
    },
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const avatarName = profile?.name || user.displayName || 'Hiro User';
  const currentPanel = activeInfoPanel ? infoPanelContent[activeInfoPanel] : null;
  const currentLanguageLabel = languageOptions.find((item) => item.value === locale)?.label || copy.english;

  async function handleNotificationsToggle() {
    if (typeof window === 'undefined') return;

    if (notificationsEnabled) {
      window.localStorage.setItem(notificationStorageKey, 'false');
      setNotificationsEnabled(false);
      toast.success(copy.notificationDisabled);
      return;
    }

    try {
      setNotificationsBusy(true);
      await registerForPushNotifications(user);
      window.localStorage.setItem(notificationStorageKey, 'true');
      setNotificationsEnabled(true);
      toast.success(copy.notificationEnabled);
    } catch (error) {
      toast.error(error?.message || copy.notificationError);
    } finally {
      setNotificationsBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await logOut();
      router.push('/');
    } catch (error) {
      toast.error(copy.signOutError);
    }
  }

  async function saveScheduleSettings(nextSettings) {
    if (!user || profile?.role !== 'worker') return;

    try {
      setScheduleBusy(true);
      await setDoc(doc(db, 'users', user.uid, 'Schedule', 'info'), {
        hideSchedule: nextSettings.enabled,
        defaultWorkingHours: {
          from: nextSettings.from,
          to: nextSettings.to,
        },
        disabledDays: [1, 2, 3, 4, 5, 6, 7].filter((day) => !nextSettings.weekdays.includes(day)),
      }, { merge: true });
      setScheduleSettings(nextSettings);
    } catch (error) {
      toast.error(copy.scheduleSaveError);
    } finally {
      setScheduleBusy(false);
    }
  }

  function handleScheduleToggle() {
    const nextSettings = {
      ...scheduleSettings,
      enabled: !scheduleSettings.enabled,
    };
    saveScheduleSettings(nextSettings);
  }

  function handleScheduleTimeChange(key, value) {
    const nextSettings = {
      ...scheduleSettings,
      [key]: value,
    };
    setScheduleSettings(nextSettings);
    saveScheduleSettings(nextSettings);
  }

  function handleWeekdayToggle(dayNumber) {
    const hasDay = scheduleSettings.weekdays.includes(dayNumber);
    const nextWeekdays = hasDay
      ? scheduleSettings.weekdays.filter((day) => day !== dayNumber)
      : [...scheduleSettings.weekdays, dayNumber].sort((a, b) => a - b);

    const nextSettings = {
      ...scheduleSettings,
      weekdays: nextWeekdays,
    };

    setScheduleSettings(nextSettings);
    saveScheduleSettings(nextSettings);
  }

  async function handleGenerateUniformFiles() {
    if (!user || user.isAnonymous || profile?.role !== 'worker' || isGeneratingUniformFiles) return;
    if (typeof window === 'undefined') return;

    const recipientEmail = window.prompt(copy.uniformFilesEmailPrompt, user.email || '');
    if (recipientEmail === null) return;

    const fromDate = window.prompt(copy.uniformFilesFromDatePrompt, new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
    if (fromDate === null) return;

    const toDate = window.prompt(copy.uniformFilesToDatePrompt, new Date().toISOString().slice(0, 10));
    if (toDate === null) return;

    if (!datePromptPattern.test(fromDate) || !datePromptPattern.test(toDate) || fromDate > toDate) {
      toast.error(copy.uniformFilesInvalidDateRange);
      return;
    }

    try {
      setIsGeneratingUniformFiles(true);
      const result = await BkmvExportService.exportForUser({ user, fromDate, toDate });
      result.files.forEach(downloadBlobFile);
      await wait(1200);

      if (recipientEmail.trim()) {
        const subject = encodeURIComponent(copy.uniformFilesEmailSubject);
        const body = encodeURIComponent([
          copy.uniformFilesEmailBody,
          '',
          `${copy.uniformFilesGeneratedFiles}:`,
          ...result.files.map((file) => `- ${file.name}`),
        ].join('\n'));
        const mailUrl = `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${subject}&body=${body}`;
        try {
          window.location.href = mailUrl;
        } catch (error) {
          throw new Error(copy.uniformFilesEmailError);
        }
      }

      toast.success(copy.uniformFilesSuccess);
    } catch (error) {
      console.error('Failed to generate uniform files:', error);
      if (error?.code === 'missing-business-details') {
        toast.error(copy.uniformFilesMissingBusiness);
      } else if (error?.code === 'no-documents') {
        toast.error(copy.uniformFilesNoDocuments);
      } else if (String(error?.message || '').includes(copy.uniformFilesEmailError)) {
        toast.error(copy.uniformFilesEmailError);
      } else {
        toast.error(error?.message || copy.uniformFilesError);
      }
    } finally {
      setIsGeneratingUniformFiles(false);
    }
  }

  function renderSettingsRow(item) {
    const Icon = item.icon;
    const ChevronIcon = isRtl ? FiChevronLeft : FiChevronRight;
    const content = (
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="block text-base font-bold text-gray-900 sm:text-lg">{item.label}</span>
          {item.subtitle ? (
            <span className="mt-0.5 block text-start text-xs font-semibold text-gray-500 sm:text-sm">{item.subtitle}</span>
          ) : null}
        </div>
      </div>
    );

    const className = 'flex w-full items-center justify-between gap-4 rounded-[28px] px-5 py-5 transition-colors hover:bg-slate-50';

    if (item.href) {
      return (
        <Link key={item.key} href={item.href} className={className}>
          {content}
          <ChevronIcon className="h-6 w-6 shrink-0 text-gray-400" />
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        onClick={item.onClick}
        disabled={item.disabled}
        className={clsx(className, item.disabled && 'cursor-not-allowed opacity-60')}
      >
        {content}
        <ChevronIcon className="h-6 w-6 shrink-0 text-gray-400" />
      </button>
    );
  }

  return (
    <>
      <Head>
        <title>{`${copy.title} | Hiro`}</title>
      </Head>

      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{copy.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{copy.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-soft transition-transform duration-200 hover:-translate-y-0.5"
              aria-label={copy.back}
            >
              {isRtl ? <FiChevronRight className="h-7 w-7" /> : <FiChevronLeft className="h-7 w-7" />}
            </button>
          </div>

          <section className="mb-6 overflow-hidden rounded-[32px] bg-hero-gradient p-5 text-white shadow-hero sm:p-6">
            <div className="flex items-center gap-4">
              {profile?.profileImageUrl ? (
                <Image
                  src={profile.profileImageUrl}
                  alt={avatarName}
                  width={76}
                  height={76}
                  className="h-[76px] w-[76px] rounded-[26px] object-cover ring-4 ring-white/15"
                />
              ) : (
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[26px] bg-white/15 text-3xl font-extrabold text-white ring-4 ring-white/15">
                  {getAvatarFallback(avatarName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold tracking-tight">{avatarName}</p>
                <p className="mt-1 text-sm font-semibold text-white/80">{roleLabel}</p>
                <div className="mt-4 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
                  <p className="truncate">{profile?.phone || copy.notProvided}</p>
                  <p className="truncate">{profile?.email || user.email || copy.notProvided}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <p className="mb-3 px-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400">{copy.accountSection}</p>
              <div className="overflow-hidden rounded-[34px] bg-white shadow-card">
                {accountRows.map(renderSettingsRow)}
              </div>
            </div>

            <div>
              <p className="mb-3 px-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400">{copy.notificationsSection}</p>
              <div className="rounded-[34px] bg-white px-5 py-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                      <FiBell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 sm:text-lg">{copy.notifications}</p>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        {notificationsEnabled ? copy.notificationsHintOn : copy.notificationsHintOff}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNotificationsToggle}
                    disabled={notificationsBusy}
                    className={clsx(
                      'relative h-12 w-28 rounded-full transition-colors duration-200',
                      notificationsEnabled ? 'bg-[#7eb2e8]' : 'bg-slate-200',
                      notificationsBusy && 'opacity-70'
                    )}
                    aria-pressed={notificationsEnabled}
                  >
                    <span
                      className={clsx(
                        'absolute top-1.5 h-9 w-9 rounded-full bg-[#2777d3] transition-all duration-200',
                        isRtl
                          ? notificationsEnabled ? 'left-2' : 'left-[4.3rem]'
                          : notificationsEnabled ? 'left-[4.3rem]' : 'left-2'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {profile?.role === 'worker' && (
              <div>
                <p className="mb-3 px-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400">{copy.scheduleSection}</p>
                <div className="rounded-[34px] bg-white px-4 py-4 shadow-card sm:px-5 sm:py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleScheduleToggle}
                      disabled={scheduleBusy}
                      className={clsx(
                        'relative h-11 w-24 shrink-0 rounded-full transition-colors duration-200 sm:h-12 sm:w-28',
                        scheduleSettings.enabled ? 'bg-[#7eb2e8]' : 'bg-slate-200',
                        scheduleBusy && 'opacity-70'
                      )}
                      aria-pressed={scheduleSettings.enabled}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 h-9 w-9 rounded-full bg-[#2777d3] transition-all duration-200 sm:top-1.5',
                          isRtl
                            ? scheduleSettings.enabled ? 'left-1.5 sm:left-2' : 'left-[3.7rem] sm:left-[4.3rem]'
                            : scheduleSettings.enabled ? 'left-[3.7rem] sm:left-[4.3rem]' : 'left-1.5 sm:left-2'
                        )}
                      />
                    </button>

                    <div className="flex min-w-0 flex-1 items-start justify-end gap-3 text-right sm:items-center sm:gap-4">
                      <div>
                        <p className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl lg:text-2xl">{copy.scheduleTitle}</p>
                        <p className="mt-1 max-w-xl text-xs text-gray-500 sm:text-sm">{copy.scheduleSubtitle}</p>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary sm:h-12 sm:w-12">
                        <FiCalendar className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-slate-200" />

                  <div className="grid gap-3 lg:grid-cols-[minmax(320px,0.9fr)_minmax(380px,1fr)] lg:items-start">
                    <div className="rounded-[26px] border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                      <div className="flex items-center justify-end gap-3">
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                          <div>
                            <p className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl">{copy.scheduleHoursTitle}</p>
                            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                              {copy.scheduleFrom} <span className="time-value">{scheduleSettings.from}</span> {copy.scheduleUntil} <span className="time-value">{scheduleSettings.to}</span>
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary sm:h-11 sm:w-11">
                            <FiClock className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 sm:text-sm sm:normal-case sm:tracking-normal">{copy.scheduleFromLabel}</span>
                          <input
                            type="time"
                            value={scheduleSettings.from}
                            onChange={(event) => handleScheduleTimeChange('from', event.target.value)}
                            className="input-field time-field text-sm sm:text-base"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 sm:text-sm sm:normal-case sm:tracking-normal">{copy.scheduleUntilLabel}</span>
                          <input
                            type="time"
                            value={scheduleSettings.to}
                            onChange={(event) => handleScheduleTimeChange('to', event.target.value)}
                            className="input-field time-field text-sm sm:text-base"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-100 bg-white p-4 sm:p-5">
                      <p className="mb-3 text-right text-base font-extrabold tracking-tight text-gray-950 sm:mb-4 sm:text-lg">{copy.scheduleWeekdaysTitle}</p>
                      <div className="grid grid-cols-4 justify-items-end gap-2 sm:grid-cols-7 sm:gap-2.5">
                        {[7, 6, 5, 4, 3, 2, 1].map((dayNumber) => {
                          const active = scheduleSettings.weekdays.includes(dayNumber);
                          return (
                            <button
                              key={dayNumber}
                              type="button"
                              onClick={() => handleWeekdayToggle(dayNumber)}
                              className={clsx(
                                'flex h-12 w-12 items-center justify-center rounded-full border-[2.5px] text-lg font-extrabold transition-colors sm:h-[3.15rem] sm:w-[3.15rem] sm:text-[1.05rem] lg:h-12 lg:w-12 lg:text-lg xl:h-[3.15rem] xl:w-[3.15rem]',
                                active
                                  ? 'border-primary bg-primary-50 text-primary'
                                  : 'border-red-400 bg-red-50 text-red-500'
                              )}
                            >
                              {dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 px-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400">{copy.languageSection}</p>
              <div className="rounded-[34px] bg-white px-5 py-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                      <FiGlobe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 sm:text-lg">{copy.language}</p>
                      <p className="text-xs text-gray-500 sm:text-sm">{currentLanguageLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm font-semibold">{currentLanguageLabel}</span>
                    <FiChevronDown className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {languageOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => changeLocale(item.value)}
                      className={clsx(
                        'rounded-2xl px-3 py-3 text-sm font-bold transition-colors',
                        locale === item.value ? 'bg-primary text-white' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 px-2 text-sm font-black uppercase tracking-[0.18em] text-gray-400">{copy.supportSection}</p>
              <div className="overflow-hidden rounded-[34px] bg-white shadow-card">
                {supportRows.map(renderSettingsRow)}
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-10 flex w-full items-center justify-center rounded-[34px] bg-white px-5 py-6 text-2xl font-extrabold text-[#ff4f3d] shadow-card transition-colors hover:bg-red-50"
          >
            <span className="flex items-center gap-3">
              <FiLogOut className="h-6 w-6" />
              {copy.signOut}
            </span>
          </button>
        </div>

        {currentPanel && (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setActiveInfoPanel('')}
          >
            <div
              className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-950">{currentPanel.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{currentPanel.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInfoPanel('')}
                  className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-gray-600"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

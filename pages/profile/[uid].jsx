import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { HiStar } from 'react-icons/hi';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  getUserProfile,
  getWorkerProjects,
  getWorkerReviews,
  addReview,
} from '../../lib/firestore';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProjectsGallery from '../../components/profile/ProjectsGallery';
import ReviewsList from '../../components/profile/ReviewsList';
import ProfileScheduleView from '../../components/profile/ProfileScheduleView';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function normalizeDateKey(input) {
  if (!input || typeof input !== 'string') return null;
  const parts = input.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return `${year}-${month}-${day}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parseDateKey(key) {
  const normalized = normalizeDateKey(key);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map((p) => Number.parseInt(p, 10));
  return new Date(year, month - 1, day);
}

function sortDateKeys(keys) {
  return [...keys].sort((a, b) => parseDateKey(a) - parseDateKey(b));
}

function addVacationDay(vacations, dayKey) {
  const normalizedDay = normalizeDateKey(dayKey);
  if (!normalizedDay) return vacations || [];

  const target = parseDateKey(normalizedDay);
  const ranges = (vacations || [])
    .map((vacation) => {
      const start = parseDateKey(vacation?.start);
      const end = parseDateKey(vacation?.end);
      if (!start || !end) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  let nextStart = target;
  let nextEnd = target;
  const nextRanges = [];

  ranges.forEach((range) => {
    const previousDay = new Date(nextStart);
    previousDay.setDate(previousDay.getDate() - 1);

    const nextDay = new Date(nextEnd);
    nextDay.setDate(nextDay.getDate() + 1);

    if (range.end < previousDay || range.start > nextDay) {
      nextRanges.push(range);
      return;
    }

    if (range.start < nextStart) nextStart = range.start;
    if (range.end > nextEnd) nextEnd = range.end;
  });

  nextRanges.push({ start: nextStart, end: nextEnd });

  return nextRanges
    .sort((a, b) => a.start - b.start)
    .map((range) => ({
      start: formatDateKey(range.start),
      end: formatDateKey(range.end),
    }));
}

function removeVacationDay(vacations, dayKey) {
  const normalizedDay = normalizeDateKey(dayKey);
  if (!normalizedDay) return vacations || [];

  const target = parseDateKey(normalizedDay);

  return (vacations || []).flatMap((vacation) => {
    const start = parseDateKey(vacation?.start);
    const end = parseDateKey(vacation?.end);
    if (!start || !end) return [];

    if (target < start || target > end) {
      return [{ start: formatDateKey(start), end: formatDateKey(end) }];
    }

    if (formatDateKey(start) === normalizedDay && formatDateKey(end) === normalizedDay) {
      return [];
    }

    if (formatDateKey(start) === normalizedDay) {
      const newStart = new Date(start);
      newStart.setDate(newStart.getDate() + 1);
      return [{ start: formatDateKey(newStart), end: formatDateKey(end) }];
    }

    if (formatDateKey(end) === normalizedDay) {
      const newEnd = new Date(end);
      newEnd.setDate(newEnd.getDate() - 1);
      return [{ start: formatDateKey(start), end: formatDateKey(newEnd) }];
    }

    const leftEnd = new Date(target);
    leftEnd.setDate(leftEnd.getDate() - 1);
    const rightStart = new Date(target);
    rightStart.setDate(rightStart.getDate() + 1);

    return [
      { start: formatDateKey(start), end: formatDateKey(leftEnd) },
      { start: formatDateKey(rightStart), end: formatDateKey(end) },
    ];
  });
}

export default function ProfilePage() {
  const router            = useRouter();
  const { uid }           = router.query;
  const { user, profile: myProfile } = useAuth();
  const { t }             = useLanguage();

  const [profile, setProfile]     = useState(null);
  const [projects, setProjects]   = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [tab, setTab]             = useState('projects');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingData, setLoadingData]       = useState(false);
  const [workerSchedule, setWorkerSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [noteText, setNoteText] = useState('');

  // Review form state
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoadingProfile(true);
    getUserProfile(uid)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);
    Promise.all([getWorkerProjects(uid), getWorkerReviews(uid)])
      .then(([p, r]) => {
        setProjects(p);
        setReviews(r);
        setProfile((current) => current ? ({
          ...current,
          projectCount: p.length,
          reviewCount: current.reviewCount ?? r.length,
        }) : current);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [uid]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!uid || profile?.role !== 'worker') {
        setWorkerSchedule(null);
        return;
      }

      try {
        setLoadingSchedule(true);
        const scheduleRef = doc(db, 'users', uid, 'Schedule', 'info');
        const scheduleSnap = await getDoc(scheduleRef);
        setWorkerSchedule(scheduleSnap.exists() ? scheduleSnap.data() : null);
      } catch (error) {
        console.error('Failed to load schedule:', error);
        setWorkerSchedule(null);
      } finally {
        setLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [uid, profile?.role]);

  useEffect(() => {
    setNoteText('');
  }, [selectedDate]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!user) return toast.error('Sign in to leave a review');
    setSubmitting(true);
    try {
      await addReview(uid, {
        rating,
        comment,
        userName: myProfile?.name || user.displayName || 'Anonymous',
      });
      toast.success('Review submitted!');
      setComment('');
      setRating(5);
      const updated = await getWorkerReviews(uid);
      setReviews(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenMessage() {
    if (!profile?.uid) return;

    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(`/profile/${profile.uid}`)}`);
      return;
    }

    if (user.uid === profile.uid) {
      router.push('/messages');
      return;
    }

    const roomId = [user.uid, profile.uid].sort().join('_');
    const roomDraft = {
      users: [user.uid, profile.uid],
      user_names: {
        [user.uid]: myProfile?.name || user.displayName || 'User',
        [profile.uid]: profile.name || 'Worker',
      },
      userNames: {
        [user.uid]: myProfile?.name || user.displayName || 'User',
        [profile.uid]: profile.name || 'Worker',
      },
      unreadCount: {
        [user.uid]: 0,
        [profile.uid]: 0,
      },
      lastMessage: '',
      lastTimestamp: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'chat_rooms', roomId), roomDraft, { merge: true });
      router.push(`/messages?roomId=${encodeURIComponent(roomId)}`);
    } catch (error) {
      console.error('Failed to open chat room:', error);
      toast.error('Could not open chat right now');
    }
  }

  async function updateSelectedDayStatus(status) {
    if (!user || user.uid !== uid || profile?.role !== 'worker') {
      toast.error('Only the worker can update this schedule');
      return;
    }

    const dayKey = normalizeDateKey(selectedDate);
    if (!dayKey) {
      toast.error('Invalid date selected');
      return;
    }

    const baseSchedule = workerSchedule || {};
    const nextAvailableDates = new Set(
      (baseSchedule.availableDates || []).map(normalizeDateKey).filter(Boolean)
    );
    const nextPartialWorkDays = { ...(baseSchedule.partialWorkDays || {}) };
    const nextVacations = removeVacationDay(baseSchedule.vacations || [], dayKey);

    delete nextPartialWorkDays[dayKey];

    if (status === 'workday') {
      nextAvailableDates.add(dayKey);
    }

    if (status === 'vacation') {
      nextAvailableDates.delete(dayKey);
    }

    let finalVacations = nextVacations;
    if (status === 'vacation') {
      finalVacations = addVacationDay(nextVacations, dayKey);
    }

    const nextSchedule = {
      ...baseSchedule,
      availableDates: sortDateKeys(Array.from(nextAvailableDates)),
      partialWorkDays: nextPartialWorkDays,
      vacations: finalVacations,
    };

    try {
      setSavingSchedule(true);
      await setDoc(doc(db, 'users', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
      setWorkerSchedule(nextSchedule);
      toast.success(status === 'vacation' ? 'Day marked as vacation' : 'Day marked as work day');
    } catch (error) {
      console.error('Failed to update schedule day:', error);
      toast.error('Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  }

  async function addNoteToSelectedDay() {
    if (!user || user.uid !== uid || profile?.role !== 'worker') {
      toast.error('Only the worker can update this schedule');
      return;
    }

    const dayKey = normalizeDateKey(selectedDate);
    const trimmedNote = noteText.trim();

    if (!dayKey) {
      toast.error('Invalid date selected');
      return;
    }

    if (!trimmedNote) {
      toast.error('Write a note first');
      return;
    }

    const baseSchedule = workerSchedule || {};
    const nextReminders = {
      ...(baseSchedule.allReminders || {}),
    };

    const existingDayReminders = Array.isArray(nextReminders[dayKey])
      ? nextReminders[dayKey]
      : [];

    nextReminders[dayKey] = [
      ...existingDayReminders,
      {
        id: `${Date.now()}`,
        text: trimmedNote,
        timestamp: new Date().toISOString(),
      },
    ];

    const nextSchedule = {
      ...baseSchedule,
      allReminders: nextReminders,
    };

    try {
      setSavingSchedule(true);
      await setDoc(doc(db, 'users', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
      setWorkerSchedule(nextSchedule);
      setNoteText('');
      toast.success('Note added');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to save note');
    } finally {
      setSavingSchedule(false);
    }
  }

  const tabs = [
    { key: 'projects', label: t.profile.projects },
    { key: 'reviews',  label: t.profile.reviews },
    { key: 'about',    label: t.profile.about },
    ...(profile?.role === 'worker' ? [{ key: 'schedule', label: t.profile.scheduleSection }] : []),
  ];

  const isOwnProfile = user?.uid === profile?.uid;
  const shouldShowWorkerActions = profile?.role === 'worker' && !isOwnProfile;
  const canEditSchedule = user?.uid === uid && profile?.role === 'worker';

  const availableDateSet = new Set(
    (workerSchedule?.availableDates || [])
      .map(normalizeDateKey)
      .filter(Boolean)
  );

  const reminderMap = Object.entries(workerSchedule?.allReminders || {}).reduce((acc, [key, value]) => {
    const normalized = normalizeDateKey(key);
    if (normalized) acc[normalized] = Array.isArray(value) ? value : [];
    return acc;
  }, {});

  const partialMap = Object.entries(workerSchedule?.partialWorkDays || {}).reduce((acc, [key, value]) => {
    const normalized = normalizeDateKey(key);
    if (normalized) acc[normalized] = value;
    return acc;
  }, {});

  const vacationRanges = (workerSchedule?.vacations || [])
    .map((vacation) => {
      const start = parseDateKey(vacation?.start);
      const end = parseDateKey(vacation?.end);
      if (!start || !end) return null;
      return {
        start,
        end,
        startKey: formatDateKey(start),
        endKey: formatDateKey(end),
      };
    })
    .filter(Boolean);

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const firstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
  }

  const selectedReminders = reminderMap[selectedDate] || [];
  const selectedPartial = partialMap[selectedDate] || null;
  const selectedVacation = vacationRanges.find((vacation) => {
    const current = parseDateKey(selectedDate);
    if (!current) return false;
    return current >= vacation.start && current <= vacation.end;
  });

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="h-48 bg-gradient-to-br from-indigo-200 to-cyan-200" />
        <div className="flex flex-col items-center -mt-14 px-4">
          <div className="w-28 h-28 rounded-full bg-gray-300 ring-4 ring-white" />
          <div className="h-5 bg-gray-300 rounded-xl w-36 mt-4" />
          <div className="h-3.5 bg-gray-200 rounded-xl w-28 mt-2" />
          <div className="flex gap-3 mt-5">
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
          </div>
          <div className="flex gap-3 mt-5 w-64">
            <div className="flex-1 h-12 rounded-2xl bg-gray-300" />
            <div className="flex-1 h-12 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{profile.name} – Hiro</title>
      </Head>

      <ProfileHeader
        profile={profile}
        showContactActions={shouldShowWorkerActions}
        onMessageClick={handleOpenMessage}
      />

      <div className="mt-4 border-t border-gray-100" />

      <div className="sticky top-0 md:top-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
        <div className="max-w-2xl mx-auto px-2 py-2">
          <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
            <div className="flex min-w-max items-center gap-1.5 md:min-w-0 md:justify-center">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={clsx(
                    'relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    tab === tb.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  {tb.label}
                  {tab === tb.key && (
                    <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {isOwnProfile && profile?.role === 'worker' && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:justify-center md:overflow-visible">
              <Link
                href="/worker/invoices"
                className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                {t.invoices.shortTitle}
              </Link>
              <Link
                href="/worker/invoices/saved"
                className="shrink-0 rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
              >
                {t.invoices.savedButton}
              </Link>
              <Link
                href="/worker/dashboard"
                className="shrink-0 rounded-2xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100"
              >
                {t.nav.dashboard}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {tab === 'projects' && (
          <ProjectsGallery projects={projects} loading={loadingData} profileUid={uid} />
        )}

        {tab === 'reviews' && (
          <div className="space-y-5">
            <ReviewsList reviews={reviews} loading={loadingData} />

            {user && uid !== user.uid && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
                    <HiStar className="w-4 h-4 text-amber-500" />
                  </span>
                  {t.profile.writeReview}
                </h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.profile.yourRating}</p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="transition-transform active:scale-90"
                        >
                          <HiStar
                            className={`w-8 h-8 transition-colors ${s <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t.profile.yourComment}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm resize-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-primary to-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? t.common.loading : t.profile.submitReview}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-5">
            {profile.description && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📝</span>
                  {t.profile.bio}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📋</span>
                  {t.profile.contactInfo}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {profile.phone && (
                  <InfoRow label="Contact" value={profile.phone} icon="📞" />
                )}
                {(profile.optionalPhone || profile.secondaryPhone) && (
                  <InfoRow label="Secondary" value={profile.optionalPhone || profile.secondaryPhone} icon="📱" />
                )}
                {profile.email && (
                  <InfoRow label="Email" value={profile.email} icon="✉️" />
                )}
                {(profile.town || profile.city) && (
                  <InfoRow label="Town" value={profile.town || profile.city} icon="🏙️" />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && profile.role === 'worker' && (
          <ProfileScheduleView uid={uid} profile={profile} />
        )}

      </div>
    </>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="font-semibold text-gray-900 text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

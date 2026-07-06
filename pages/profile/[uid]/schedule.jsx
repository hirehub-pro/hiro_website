import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { HiArrowLeft } from 'react-icons/hi';
import { db } from '../../../lib/firebase';
import { getUserProfile } from '../../../lib/firestore';
import ProfileHeader from '../../../components/profile/ProfileHeader';
import ProfileScheduleView from '../../../components/profile/ProfileScheduleView';
import { useAuth } from '../../../contexts/AuthContext';
import { getProfilePageSeo } from '../../../lib/page-seo';
import { absoluteUrl } from '../../../lib/seo-locale';

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

export default function WorkerSchedulePage() {
  const router = useRouter();
  const { uid } = router.query;
  const { user, profile: myProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [workerSchedule, setWorkerSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [noteText, setNoteText] = useState('');
  const seo = getProfilePageSeo(profile, { schedule: true });
  const canonicalUrl = uid ? absoluteUrl(`/profile/${uid}/schedule`) : absoluteUrl('/search');

  useEffect(() => {
    if (!uid) return;
    setLoadingProfile(true);
    getUserProfile(uid)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
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

  async function handleOpenMessage() {
    if (!profile?.uid) return;

    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(`/profile/${profile.uid}/schedule`)}`);
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

  const canEditSchedule = user?.uid === uid && profile?.role === 'worker';
  const isOwnProfile = user?.uid === profile?.uid;
  const showContactActions = profile?.role === 'worker' && !isOwnProfile;

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
          <div className="h-28 w-28 rounded-full bg-gray-300 ring-4 ring-white" />
          <div className="mt-4 h-5 w-36 rounded-xl bg-gray-300" />
          <div className="mt-2 h-3.5 w-28 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'worker') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">Schedule is only available for worker profiles.</p>
          <Link
            href={uid ? `/profile/${uid}` : '/'}
            className="mt-4 inline-flex rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <ProfileHeader
        profile={profile}
        showContactActions={showContactActions}
        onMessageClick={handleOpenMessage}
      />

      <div className="mt-4 border-t border-gray-100" />

      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md md:top-16">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/profile/${uid}`}
>
              <HiArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>

            {canEditSchedule ? (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <Link
                  href="/worker/invoices"
                  className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Invoices
                </Link>
                <Link
                  href="/worker/invoices/saved"
                  className="shrink-0 rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                >
                  Saved Documents
                </Link>
                <Link
                  href="/worker/dashboard"
                  className="shrink-0 rounded-2xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100"
                >
                  Dashboard
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5">
        <ProfileScheduleView uid={uid} profile={profile} />
      </div>
    </>
  );
}

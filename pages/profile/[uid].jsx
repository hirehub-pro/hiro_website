import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { HiStar } from 'react-icons/hi';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

  // Worker schedule state
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
      } catch (err) {
        console.error('Failed to load schedule:', err);
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
    ...(profile?.role === 'worker' ? [{ key: 'schedule', label: 'Schedule' }] : []),
  ];

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);

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
    .map((v) => {
      const start = parseDateKey(v?.start);
      const end = parseDateKey(v?.end);
      if (!start || !end) return null;
      return {
        start,
        end,
        startKey: formatDateKey(start),
        endKey: formatDateKey(end),
      };
    })
    .filter(Boolean);

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
  const selectedVacation = vacationRanges.find((vac) => {
    const current = parseDateKey(selectedDate);
    if (!current) return false;
    return current >= vac.start && current <= vac.end;
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

      <ProfileHeader profile={profile} />

      <div className="mt-4 border-t border-gray-100" />

      <div className="sticky top-0 md:top-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
        <div className="max-w-2xl mx-auto flex px-2">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={clsx(
                'flex-1 py-3.5 text-sm font-semibold transition-all duration-200 relative',
                tab === tb.key ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {tb.label}
              {tab === tb.key && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r from-primary to-indigo-500" />
              )}
            </button>
          ))}
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
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📅</span>
                  Schedule
                </h3>
                <div className="text-xs text-gray-500">
                  {workerSchedule?.timezone || 'Local time'}
                </div>
              </div>

              {loadingSchedule && <p className="text-sm text-gray-500">Loading schedule...</p>}
              {!loadingSchedule && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-green-200 bg-green-50/60 p-3">
                      <p className="text-xs text-green-700 font-semibold">Available</p>
                      <p className="text-xl font-bold text-green-800 mt-1">{availableDateSet.size}</p>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
                      <p className="text-xs text-red-700 font-semibold">Vacations</p>
                      <p className="text-xl font-bold text-red-800 mt-1">{vacationRanges.length}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                      <p className="text-xs text-amber-700 font-semibold">Partial</p>
                      <p className="text-xl font-bold text-amber-800 mt-1">{Object.keys(partialMap).length}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Previous month"
                      >
                        ‹
                      </button>
                      <h4 className="text-2xl font-semibold text-gray-800 tracking-tight">{monthLabel}</h4>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Next month"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm text-gray-500 mb-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
                        <div key={name} className="py-1 font-medium">{name}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarCells.map((cellDate, index) => {
                        if (!cellDate) {
                          return <div key={`empty-${index}`} className="aspect-square" />;
                        }

                        const dayKey = formatDateKey(cellDate);
                        const isSelected = selectedDate === dayKey;
                        const isToday = formatDateKey(new Date()) === dayKey;
                        const isAvailable = availableDateSet.has(dayKey);
                        const hasReminder = (reminderMap[dayKey] || []).length > 0;
                        const hasPartial = Boolean(partialMap[dayKey]);
                        const isVacation = vacationRanges.some((vac) => cellDate >= vac.start && cellDate <= vac.end);

                        return (
                          <button
                            type="button"
                            key={dayKey}
                            onClick={() => setSelectedDate(dayKey)}
                            className={clsx(
                              'aspect-square rounded-2xl text-sm sm:text-base border transition-all relative',
                              isSelected && 'bg-primary text-white border-primary shadow-sm',
                              !isSelected && isVacation && 'border-red-300 text-red-600 bg-red-50/70',
                              !isSelected && !isVacation && isAvailable && 'border-green-300 text-green-700 bg-green-50/70',
                              !isSelected && !isVacation && !isAvailable && 'border-transparent text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            <span>{cellDate.getDate()}</span>
                            {isToday && !isSelected && (
                              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                            {(hasReminder || hasPartial) && (
                              <span
                                className={clsx(
                                  'absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full',
                                  hasReminder ? 'bg-red-500' : 'bg-amber-500'
                                )}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Work day</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Vacation</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Partial / reminder</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Selected day</h4>
                      <span className="text-sm text-gray-500">{selectedDate}</span>
                    </div>

                    {canEditSchedule && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSelectedDayStatus('workday')}
                          disabled={savingSchedule}
                          className="rounded-xl bg-green-600 text-white px-3 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          {savingSchedule ? 'Saving...' : 'Mark as work day'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedDayStatus('vacation')}
                          disabled={savingSchedule}
                          className="rounded-xl bg-red-600 text-white px-3 py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                          {savingSchedule ? 'Saving...' : 'Mark as vacation'}
                        </button>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                          Tap a day, then choose its status.
                        </div>
                      </div>
                    )}

                    {canEditSchedule && (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-gray-900 text-sm">Add note for this day</h5>
                          <span className="text-xs text-gray-500">{selectedDate}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Write a note for this day"
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            onClick={addNoteToSelectedDay}
                            disabled={savingSchedule || !noteText.trim()}
                            className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                          >
                            {savingSchedule ? 'Saving...' : 'Add note'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs">
                      {availableDateSet.has(selectedDate) && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Available</span>
                      )}
                      {selectedVacation && (
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Vacation</span>
                      )}
                      {selectedPartial && (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Partial hours</span>
                      )}
                      {selectedReminders.length > 0 && (
                        <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">{selectedReminders.length} reminder(s)</span>
                      )}
                      {!availableDateSet.has(selectedDate) && !selectedVacation && !selectedPartial && selectedReminders.length === 0 && (
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">No events</span>
                      )}
                    </div>

                    {selectedPartial && (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
                        Partial work time: {selectedPartial?.from || '--:--'} - {selectedPartial?.to || '--:--'}
                      </div>
                    )}

                    {selectedVacation && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-800">
                        Vacation range: {selectedVacation.startKey} to {selectedVacation.endKey}
                      </div>
                    )}

                    {selectedReminders.length > 0 && (
                      <div className="space-y-2">
                        {selectedReminders.map((reminder, idx) => (
                          <div key={`${reminder?.id || idx}`} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                            <p className="text-sm text-gray-800">{reminder?.text || 'Reminder'}</p>
                            {reminder?.timestamp && (
                              <p className="text-xs text-gray-500 mt-1">{String(reminder.timestamp)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
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
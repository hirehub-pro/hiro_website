import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  FieldPath,
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const CityMapPickerModal = dynamic(() => import('../auth/CityMapPickerModal'), {
  ssr: false,
});

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

function getMediaKindFromFile(file) {
  if (!file?.type) return '';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return '';
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

export default function ProfileScheduleView({ uid, profile }) {
  const router = useRouter();
  const { user, profile: myProfile } = useAuth();
  const { t } = useLanguage();
  const [workerSchedule, setWorkerSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [noteText, setNoteText] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestHourFrom, setRequestHourFrom] = useState('');
  const [requestHourTo, setRequestHourTo] = useState('');
  const [requestLocation, setRequestLocation] = useState({
    label: '',
    lat: null,
    lng: null,
  });
  const [requestMediaFiles, setRequestMediaFiles] = useState([]);
  const [requestMediaPreviews, setRequestMediaPreviews] = useState([]);
  const [requestLocationLoading, setRequestLocationLoading] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const requestMediaPreviewsRef = useRef([]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!uid || profile?.role !== 'worker') {
        setWorkerSchedule(null);
        return;
      }

      try {
        setLoadingSchedule(true);
        const scheduleRef = doc(db, 'publicWorkerProfiles', uid, 'Schedule', 'info');
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

  useEffect(() => {
    requestMediaPreviewsRef.current = requestMediaPreviews;
  }, [requestMediaPreviews]);

  useEffect(() => (
    () => {
      requestMediaPreviewsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    }
  ), []);

  function resetRequestForm() {
    setRequestDescription('');
    setRequestHourFrom('');
    setRequestHourTo('');
    setRequestLocation({ label: '', lat: null, lng: null });
    setRequestMediaFiles([]);
    requestMediaPreviews.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setRequestMediaPreviews([]);
  }

  function openWorkdayRequestModal() {
    if (!profile?.uid) return;

    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(router.asPath || `/profile/${uid}`)}`);
      return;
    }

    if (user.uid === profile.uid) return;

    setRequestModalOpen(true);
  }

  function closeWorkdayRequestModal() {
    if (submittingRequest) return;
    setRequestModalOpen(false);
  }

  function handleRequestMediaChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (requestMediaFiles.length + files.length > 5) {
      toast.error('You can upload up to 5 images or videos.');
      event.target.value = '';
      return;
    }

    const invalidFile = files.find((file) => !getMediaKindFromFile(file));
    if (invalidFile) {
      toast.error('Only image and video files are allowed.');
      event.target.value = '';
      return;
    }

    setRequestMediaFiles((prev) => [...prev, ...files]);
    setRequestMediaPreviews((prev) => [
      ...prev,
      ...files.map((file, index) => ({
        id: `${file.name}_${file.size}_${prev.length + index}`,
        name: file.name,
        kind: getMediaKindFromFile(file),
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = '';
  }

  function removeRequestMediaAtIndex(indexToRemove) {
    setRequestMediaFiles((prev) => prev.filter((_file, index) => index !== indexToRemove));
    setRequestMediaPreviews((prev) => prev.filter((item, index) => {
      if (index === indexToRemove && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return index !== indexToRemove;
    }));
  }

  function useCurrentRequestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Current location is not available on this device.');
      return;
    }

    setRequestLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setRequestLocation({
          label: `Current location (${lat}, ${lng})`,
          lat,
          lng,
        });
        setRequestLocationLoading(false);
      },
      () => {
        toast.error('Could not get your current location.');
        setRequestLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function handleMapLocationConfirm(location) {
    setRequestLocation({
      label: location.city || `Map location (${location.lat}, ${location.lng})`,
      lat: location.lat,
      lng: location.lng,
    });
    setMapPickerOpen(false);
  }

  async function submitWorkdayRequest(event) {
    event.preventDefault();

    if (!user || !profile?.uid) return;

    const description = requestDescription.trim();
    if (!description) {
      toast.error('Write the job description first.');
      return;
    }

    if (!requestHourFrom || !requestHourTo) {
      toast.error('Choose the time window.');
      return;
    }

    if (!requestLocation.label || !Number.isFinite(requestLocation.lat) || !Number.isFinite(requestLocation.lng)) {
      toast.error('Choose a location for the job.');
      return;
    }

    const roomId = [user.uid, profile.uid].sort().join('_');
    const requestRef = doc(collection(db, 'users', user.uid, 'requests'));
    const requestId = requestRef.id;
    const workerRequestRef = doc(db, 'users', profile.uid, 'RequestToMe', requestId);
    const workerNotificationRef = doc(db, 'users', profile.uid, 'notifications', requestId);
    const profession = Array.isArray(profile.professions) ? (profile.professions[0] || '') : '';
    const fromName = myProfile?.name || user.displayName || 'User';
    const fromLocation = myProfile?.town || myProfile?.city || '';
    const workerName = profile.name || 'Worker';
    const roomDraft = {
      users: [user.uid, profile.uid],
      user_names: {
        [user.uid]: fromName,
        [profile.uid]: workerName,
      },
      userNames: {
        [user.uid]: fromName,
        [profile.uid]: workerName,
      },
    };

    try {
      setSubmittingRequest(true);

      const uploadedMedia = await Promise.all(requestMediaFiles.map(async (file, index) => {
        const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
        const path = `request_images/${user.uid}_${requestId}_${index}${extension ? `.${extension}` : ''}`;
        const uploaded = await uploadBytes(storageRef(storage, path), file, {
          contentType: file.type,
        });
        return {
          type: getMediaKindFromFile(file) || 'media',
          url: await getDownloadURL(uploaded.ref),
        };
      }));

      const images = uploadedMedia
        .filter((item) => item.type === 'image')
        .map((item) => item.url);
      const videos = uploadedMedia
        .filter((item) => item.type === 'video')
        .map((item) => item.url);
      const mapsUrl = `https://maps.google.com/?q=${requestLocation.lat},${requestLocation.lng}`;
      const requestUrl = `/requests/${encodeURIComponent(requestId)}`;
      const notificationBody = `${fromName}${fromLocation ? ` (${fromLocation})` : ''} requested you to work on ${selectedDate} from ${requestHourFrom} to ${requestHourTo}.`;
      const chatMessage = `I sent you a work request for ${selectedDate}.`;
      const requestPayload = {
        body: notificationBody,
        cancelledAt: null,
        date: selectedDate,
        fromId: user.uid,
        fromLocation,
        fromName,
        images,
        videos,
        media: uploadedMedia,
        jobDescription: description,
        latitude: requestLocation.lat,
        locationName: requestLocation.label,
        longitude: requestLocation.lng,
        mapUrl: mapsUrl,
        profession,
        requestId,
        requestedFrom: requestHourFrom,
        requestedTo: requestHourTo,
        requestUrl,
        serviceLocationType: 'provider_travels',
        status: 'pending',
        timestamp: serverTimestamp(),
        title: 'Work Request',
        type: 'work_request',
        workerId: profile.uid,
        workerName,
        workerNotificationId: requestId,
      };
      const notificationPayload = {
        ...requestPayload,
        createdAt: serverTimestamp(),
        message: notificationBody,
        read: false,
        requestOwnerId: profile.uid,
        roomId,
        url: requestUrl,
      };

      await Promise.all([
        setDoc(requestRef, requestPayload),
        setDoc(workerRequestRef, {
          ...requestPayload,
          receivedAt: serverTimestamp(),
        }),
        setDoc(workerNotificationRef, notificationPayload),
        setDoc(doc(db, 'chat_rooms', roomId), roomDraft, { merge: true }),
      ]);

      const messageRef = await addDoc(collection(db, 'chat_rooms', roomId, 'messages'), {
        isSystem: true,
        message: chatMessage,
        receiverId: profile.uid,
        requestId,
        requestOwnerId: user.uid,
        requestUrl,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        type: 'request_link',
        workerNotificationId: requestId,
      });

      await updateDoc(
        doc(db, 'chat_rooms', roomId),
        'lastMessage',
        chatMessage,
        'lastTimestamp',
        serverTimestamp(),
        new FieldPath('unreadCount', profile.uid),
        increment(1),
        new FieldPath('unreadCount', user.uid),
        0
      );

      await updateDoc(workerNotificationRef, {
        messageId: messageRef.id,
      });

      resetRequestForm();
      setRequestModalOpen(false);
      router.push({
        pathname: '/messages',
        query: {
          roomId,
        },
      });
    } catch (error) {
      console.error('Failed to submit workday request:', error);
      toast.error('Could not prepare the request right now.');
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function openRequestMessage(requestType) {
    if (!profile?.uid) return;

    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(router.asPath || `/profile/${uid}`)}`);
      return;
    }

    if (user.uid === profile.uid) return;

    const roomId = [user.uid, profile.uid].sort().join('_');
    const requestText = requestType === 'quote'
      ? `Hi ${profile.name || ''}, I would like a quote for ${selectedDate}.`
      : `Hi ${profile.name || ''}, are you available to work on ${selectedDate}?`;

    const roomDraft = {
      users: [user.uid, profile.uid],
      user_names: {
        [user.uid]: user.displayName || 'User',
        [profile.uid]: profile.name || 'Worker',
      },
      userNames: {
        [user.uid]: user.displayName || 'User',
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
      router.push({
        pathname: '/messages',
        query: {
          roomId,
          draft: requestText,
        },
      });
    } catch (error) {
      console.error('Failed to open request chat:', error);
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
    const currentIsWorkday = nextAvailableDates.has(dayKey);
    const currentIsVacation = (baseSchedule.vacations || []).some((vacation) => {
      const start = parseDateKey(vacation?.start);
      const end = parseDateKey(vacation?.end);
      const current = parseDateKey(dayKey);
      if (!start || !end || !current) return false;
      return current >= start && current <= end;
    });

    delete nextPartialWorkDays[dayKey];

    if (status === 'workday') {
      if (currentIsWorkday) {
        nextAvailableDates.delete(dayKey);
      } else {
        nextAvailableDates.add(dayKey);
      }
    }

    if (status === 'vacation') {
      nextAvailableDates.delete(dayKey);
    }

    let finalVacations = nextVacations;
    if (status === 'vacation' && !currentIsVacation) {
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
      await setDoc(doc(db, 'publicWorkerProfiles', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
      setWorkerSchedule(nextSchedule);
      if (status === 'vacation') {
        toast.success(currentIsVacation ? 'Vacation removed from this day' : 'Day marked as vacation');
      } else {
        toast.success(currentIsWorkday ? 'Working day removed' : 'Day marked as work day');
      }
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
      await setDoc(doc(db, 'publicWorkerProfiles', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
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
  for (let i = 0; i < firstWeekday; i += 1) calendarCells.push(null);
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
  const currentMonthDates = calendarCells.filter(Boolean);
  const workingDaysCount = currentMonthDates.filter((cellDate) => {
    const dayKey = formatDateKey(cellDate);
    return availableDateSet.has(dayKey);
  }).length;
  const vacationDaysCount = currentMonthDates.filter((cellDate) => {
    return vacationRanges.some((vacation) => cellDate >= vacation.start && cellDate <= vacation.end);
  }).length;
  const partialDaysCount = currentMonthDates.filter((cellDate) => {
    const dayKey = formatDateKey(cellDate);
    return Boolean(partialMap[dayKey]);
  }).length;
  const unmarkedDaysCount = currentMonthDates.filter((cellDate) => {
    const dayKey = formatDateKey(cellDate);
    const isAvailable = availableDateSet.has(dayKey);
    const isVacation = vacationRanges.some((vacation) => cellDate >= vacation.start && cellDate <= vacation.end);
    const hasPartial = Boolean(partialMap[dayKey]);
    const hasReminder = (reminderMap[dayKey] || []).length > 0;

    return !isAvailable && !isVacation && !hasPartial && !hasReminder;
  }).length;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📅</span>
            {t.profile.scheduleSection}
          </h3>
          <div className="text-xs text-gray-500">
            {workerSchedule?.timezone || 'Local time'}
          </div>
        </div>

        {loadingSchedule && <p className="text-sm text-gray-500">{t.profile.loadingSchedule}</p>}
        {!loadingSchedule && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-green-200 bg-green-50/60 p-3">
                <p className="text-xs text-green-700 font-semibold">Working day</p>
                <p className="text-xl font-bold text-green-800 mt-1">{workingDaysCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs text-slate-600 font-semibold">Available days</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{unmarkedDaysCount}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
                <p className="text-xs text-red-700 font-semibold">Vacations</p>
                <p className="text-xl font-bold text-red-800 mt-1">{vacationDaysCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                <p className="text-xs text-amber-700 font-semibold">Partial</p>
                <p className="text-xl font-bold text-amber-800 mt-1">{partialDaysCount}</p>
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
                  const isVacation = vacationRanges.some((vacation) => cellDate >= vacation.start && cellDate <= vacation.end);

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
                    {savingSchedule ? 'Saving...' : availableDateSet.has(selectedDate) ? 'Unmark work day' : 'Mark as work day'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedDayStatus('vacation')}
                    disabled={savingSchedule}
                    className="rounded-xl bg-red-600 text-white px-3 py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {savingSchedule ? 'Saving...' : selectedVacation ? 'Unmark vacation' : 'Mark as vacation'}
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

              {!canEditSchedule && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openWorkdayRequestModal}
                    className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Ask professional to work this day
                  </button>
                  <button
                    type="button"
                    onClick={() => openRequestMessage('quote')}
                    className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    Ask for a quote
                  </button>
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

      {requestModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Work request</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">Ask professional to work this day</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedDate}</p>
              </div>
              <button
                type="button"
                onClick={closeWorkdayRequestModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close request form"
              >
                x
              </button>
            </div>

            <form onSubmit={submitWorkdayRequest} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Job description</span>
                <textarea
                  value={requestDescription}
                  onChange={(event) => setRequestDescription(event.target.value)}
                  rows={5}
                  placeholder="Describe what needs to be done"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-800">Time window</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="sr-only">From time</span>
                    <input
                      type="time"
                      value={requestHourFrom}
                      onChange={(event) => setRequestHourFrom(event.target.value)}
                      className="time-field w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">To time</span>
                    <input
                      type="time"
                      value={requestHourTo}
                      onChange={(event) => setRequestHourTo(event.target.value)}
                      className="time-field w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800">Photos or videos</span>
                  <span className="text-xs font-medium text-slate-500">{requestMediaFiles.length}/5</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  <span>Add up to 5 images or videos</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleRequestMediaChange}
                    className="sr-only"
                  />
                </label>
                {requestMediaPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {requestMediaPreviews.map((item, index) => (
                      <div key={item.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <div className="relative aspect-square">
                          {item.kind === 'image' ? (
                            <Image
                              src={item.previewUrl}
                              alt=""
                              fill
                              sizes="120px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <video src={item.previewUrl} className="h-full w-full object-cover" muted />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRequestMediaAtIndex(index)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-slate-700 shadow"
                          aria-label="Remove media"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-800">Location</span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className={clsx('text-sm font-medium', requestLocation.label ? 'text-slate-900' : 'text-slate-500')}>
                    {requestLocation.label || 'Choose current location or pick on map'}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={useCurrentRequestLocation}
                      disabled={requestLocationLoading}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {requestLocationLoading ? 'Getting location...' : 'Use current location'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
                    >
                      Choose in map
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeWorkdayRequestModal}
                  disabled={submittingRequest}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
                >
                  {submittingRequest ? 'Preparing...' : 'Continue to chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CityMapPickerModal
        isOpen={mapPickerOpen}
        allowAnyLocation
        eyebrow="Job location"
        title="Choose job location"
        subtitle="Tap the map or drag the pin to the job address."
        selectedLabel="Selected location"
        emptySelectionText="Tap on the map to choose a location"
        initialCity={requestLocation.label}
        initialLat={requestLocation.lat}
        initialLng={requestLocation.lng}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapLocationConfirm}
      />
    </div>
  );
}

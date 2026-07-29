import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { HiBell, HiCheck, HiLocationMarker, HiPlus, HiRefresh, HiX } from 'react-icons/hi';
import { FiSettings, FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Image from 'next/image';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { createUserSavedLocation, getUserSavedLocations, setUserActiveLocation } from '../../lib/firestore';
import { replacePathLocale } from '../../lib/seo-locale';

const CityMapPickerModal = dynamic(() => import('../auth/CityMapPickerModal'), {
  ssr: false,
});

const localeLabels = { en: 'EN', he: 'עב', ar: 'ع' };
const dateLocales = { en: 'en-US', he: 'he-IL', ar: 'ar' };

export default function Header() {
  const { user, profile, logOut, isAdmin, isWorker, setProfile } = useAuth();
  const { t, locale, changeLocale } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsDeleting, setNotificationsDeleting] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationSavingId, setLocationSavingId] = useState('');
  const [currentLocation, setCurrentLocation] = useState({
    loading: false,
    error: '',
    lat: null,
    lng: null,
    label: '',
  });
  const [locationsData, setLocationsData] = useState({
    activeLocationId: '',
    activeLocationUpdatedAt: null,
    locations: [],
  });

  const locationTexts = t.locations || {};
  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;

  const navLinks = [
    { href: '/',          label: t.nav.home },
    { href: '/search',    label: t.nav.search },
    { href: '/community', label: t.nav.blog },
    { href: '/messages',  label: t.nav.messages },
    ...(user ? [{ href: '/requests', label: t.nav.requests }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    async function loadNotificationBadge() {
      try {
        const notificationsSnap = await getDocs(collection(db, 'users', user.uid, 'notifications'));
        if (cancelled) return;
        setNotifications(notificationsSnap.docs
          .map((notificationDoc) => normalizeNotification(notificationDoc.id, notificationDoc.data()))
          .sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          }));
      } catch (error) {
        if (!cancelled) setNotifications([]);
      }
    }

    loadNotificationBadge();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  function normalizeNotification(notificationId, data) {
    const createdAt = data.createdAt || data.timestamp || null;
    return {
      id: notificationId,
      body: data.body || data.message || '',
      createdAt: createdAt?.toDate?.() || null,
      fromName: data.fromName || data.fromUserName || data.title || 'Someone',
      message: data.message || data.body || '',
      read: data.read === true,
      requestId: data.requestId || '',
      roomId: data.roomId || '',
      title: data.title || (data.type === 'work_request' ? 'Work Request' : 'Notification'),
      type: data.type || 'notification',
      url: data.url || (data.requestId ? `/requests/${encodeURIComponent(data.requestId)}` : ''),
    };
  }

  useEffect(() => {
    if (!locationsOpen && !notificationsOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setLocationsOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [locationsOpen, notificationsOpen]);

  function formatLocationDate(value) {
    if (!value) return '';

    return new Intl.DateTimeFormat(dateLocales[locale] || 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  }

  function handleLocaleChange(nextLocale) {
    changeLocale(nextLocale);

    const isSearchRoute = /^\/(?:(?:en|ar)\/)?search(?:\/|$|\?)/.test(router.asPath);
    if (!isSearchRoute) return;

    const nextPath = replacePathLocale(router.asPath, nextLocale);
    if (nextPath !== router.asPath) {
      router.push(nextPath);
    }
  }

  async function handleOpenLocations() {
    if (!user?.uid) return;

    setLocationsOpen(true);
    setLocationsLoading(true);
    setLocationsError('');
    loadCurrentLocation();

    try {
      const savedLocations = await getUserSavedLocations(user.uid);
      setLocationsData(savedLocations);
    } catch (error) {
      setLocationsError(locationTexts.error || 'Could not load saved locations right now.');
    } finally {
      setLocationsLoading(false);
    }
  }

  async function handleOpenNotifications() {
    if (!user?.uid) return;

    setNotificationsOpen(true);
    setNotificationsLoading(true);
    setNotificationsError('');

    try {
      const notificationsSnap = await getDocs(collection(db, 'users', user.uid, 'notifications'));
      const nextNotifications = notificationsSnap.docs
        .map((notificationDoc) => normalizeNotification(notificationDoc.id, notificationDoc.data()))
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });
      setNotifications(nextNotifications);
    } catch (error) {
      setNotificationsError('Could not load notifications right now.');
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function handleOpenNotification(notification) {
    if (!user?.uid || !notification) return;

    if (!notification.read) {
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read: true } : item
      )));
      try {
        await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), {
          read: true,
        });
      } catch (error) {
        // Keep the UI responsive even if read-state syncing fails.
      }
    }

    if (notification.url) {
      setNotificationsOpen(false);
      setMenuOpen(false);
      router.push(notification.url);
    }
  }

  async function handleDeleteAllNotifications() {
    if (!user?.uid || notifications.length === 0 || notificationsDeleting) return;

    setNotificationsDeleting(true);
    setNotificationsError('');

    try {
      await Promise.all(
        notifications.map((notification) => (
          deleteDoc(doc(db, 'users', user.uid, 'notifications', notification.id))
        ))
      );
      setNotifications([]);
      toast.success('All notifications deleted.');
    } catch (error) {
      setNotificationsError('Could not delete notifications right now.');
      toast.error('Could not delete notifications right now.');
    } finally {
      setNotificationsDeleting(false);
    }
  }

  function loadCurrentLocation() {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setCurrentLocation({
        loading: false,
        error: locationTexts.currentUnsupported || 'Current location is not supported on this device.',
        lat: null,
        lng: null,
        label: locationTexts.currentLabel || 'Current location',
      });
      return;
    }

    setCurrentLocation((prev) => ({
      ...prev,
      loading: true,
      error: '',
      label: locationTexts.currentLabel || 'Current location',
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          loading: false,
          error: '',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: locationTexts.currentLabel || 'Current location',
        });
      },
      () => {
        setCurrentLocation({
          loading: false,
          error: locationTexts.currentError || 'Could not get your current location.',
          lat: null,
          lng: null,
          label: locationTexts.currentLabel || 'Current location',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  async function handleSelectLocation({
    id,
    label,
    lat,
    lng,
    source,
  }) {
    if (!user?.uid || typeof lat !== 'number' || typeof lng !== 'number') {
      return;
    }

    setLocationSavingId(id);

    try {
      await setUserActiveLocation(user.uid, {
        locationId: id,
        locationLabel: label,
        lat,
        lng,
        source,
      });

      const selectedAt = new Date();

      setLocationsData((current) => ({
        ...current,
        activeLocationId: id,
        activeLocationUpdatedAt: selectedAt,
        locations: current.locations.map((locationItem) => (
          locationItem.id === id
            ? { ...locationItem, updatedAt: selectedAt }
            : locationItem
        )),
      }));

      setProfile((current) => (current ? {
        ...current,
        activeLocationId: id,
        activeLocationLabel: label,
        activeLocationSource: source,
        activeLocationUpdatedAt: selectedAt,
        activeSearchLat: lat,
        activeSearchLng: lng,
      } : current));

      toast.success(locationTexts.savedSuccess || 'Location updated for the app.');
    } catch (error) {
      toast.error(locationTexts.saveError || 'Could not update the active location.');
    } finally {
      setLocationSavingId('');
    }
  }

  async function handleAddLocationConfirm(location) {
    if (!user?.uid || addingLocation || typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
      return;
    }

    setAddingLocation(true);

    try {
      const label = location.name?.trim() || location.city?.trim() || `${formatCoordinate(location.lat)}, ${formatCoordinate(location.lng)}`;
      const savedLocation = await createUserSavedLocation(user.uid, {
        label,
        lat: location.lat,
        lng: location.lng,
      });

      setLocationsData((current) => ({
        ...current,
        locations: [
          savedLocation,
          ...current.locations.filter((locationItem) => locationItem.id !== savedLocation.id),
        ],
      }));
      setAddLocationOpen(false);
      toast.success(locationTexts.addSuccess || 'Location added.');
    } catch (error) {
      toast.error(locationTexts.addError || 'Could not add this location.');
    } finally {
      setAddingLocation(false);
    }
  }

  return (
    <>
      <header className="hidden md:block sticky top-0 z-50 px-4 pt-4">
        <div className="glass max-w-7xl mx-auto h-18 rounded-[28px] border border-white/60 shadow-soft">
          <div className="h-full px-6 flex items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-3 shrink-0 animate-slide-right">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-hero-gradient shadow-glow-sm">
                <Image
                  src="/web-app-manifest-192x192.png"
                  alt="Hiro"
                  fill
                  sizes="44px"
                  className="object-cover"
                  priority
                />
                <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] animate-shimmer opacity-40" />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight text-gray-950">Hiro</p>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/70">Trusted local pros</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1 rounded-2xl bg-white/55 p-1">
              {navLinks.map((l, index) => {
                const active = router.pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={clsx(
                      'animate-fade-up rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200',
                      active
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:bg-white/80 hover:text-gray-950'
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 animate-slide-left">
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
                {Object.keys(localeLabels).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                    className={clsx(
                      'rounded-xl px-2.5 py-1 text-xs font-bold transition-all duration-200',
                      locale === l ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    {localeLabels[l]}
                  </button>
                ))}
              </div>

              {user ? (
                <>
                  <button
                    onClick={handleOpenLocations}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-primary hover:shadow-soft"
                    title={locationTexts.button || 'GPS'}
                  >
                    <HiLocationMarker className="h-5 w-5" />
                    <span className="text-sm font-semibold">{locationTexts.button || 'GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-primary hover:shadow-soft"
                    title="Notifications"
                  >
                    <HiBell className="h-5 w-5" />
                    {unreadNotificationsCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    ) : null}
                  </button>

                  <Link
                    href="/settings"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-primary hover:shadow-soft"
                    title={t.nav.settings}
                  >
                    <FiSettings className="h-5 w-5" />
                  </Link>

                  <Link href={`/profile/${user.uid}`} className="block rounded-full transition-transform duration-200 hover:scale-105">
                    {profile?.profileImageUrl ? (
                      <Image
                        src={profile.profileImageUrl}
                        alt={profile.name}
                        width={42}
                        height={42}
                        className="rounded-full object-cover ring-2 ring-primary/20"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 ring-2 ring-primary/20">
                        <FiUser className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </Link>

                  <button
                    onClick={logOut}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:text-red-500"
                    title="Sign out"
                  >
                    <FiLogOut className="h-4.5 w-4.5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="rounded-2xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-primary"
                  >
                    {t.auth.signIn}
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-2xl bg-hero-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
                  >
                    {t.auth.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <header className="md:hidden sticky top-0 z-50 px-4 pt-3">
        <div className="glass rounded-[24px] border border-white/60 shadow-soft">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-hero-gradient shadow-glow-sm">
                <Image
                  src="/web-app-manifest-192x192.png"
                  alt="Hiro"
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
                <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] animate-shimmer opacity-35" />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold text-gray-950">Hiro</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60">Local services</p>
              </div>
            </Link>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-gray-700"
              aria-label="Toggle menu"
            >
              {menuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-white/50 px-4 pb-4 pt-2 animate-fade-up">
              <nav className="space-y-2">
                {navLinks.map((l, index) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      'block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                      router.pathname === l.href ? 'bg-primary-50 text-primary' : 'text-gray-700 hover:bg-white/70'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              {user && (
                <>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      'mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                      router.pathname === '/settings' ? 'bg-primary-50 text-primary' : 'bg-white/70 text-gray-700 hover:bg-white'
                    )}
                  >
                    <FiSettings className="h-5 w-5" />
                    {t.nav.settings}
                  </Link>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleOpenLocations();
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-100"
                  >
                    <HiLocationMarker className="h-5 w-5" />
                    {locationTexts.button || 'GPS'}
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleOpenNotifications();
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white"
                  >
                    <HiBell className="h-5 w-5" />
                    Notifications
                    {unreadNotificationsCount > 0 ? (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    ) : null}
                  </button>
                </>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
                  {Object.keys(localeLabels).map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLocale(l)}
                      className={clsx(
                        'rounded-xl px-2.5 py-1 text-xs font-bold transition-all duration-200',
                        locale === l ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
                      )}
                    >
                      {localeLabels[l]}
                    </button>
                  ))}
                </div>
                {!user && (
                  <Link href="/auth/signup" className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-white">
                    {t.auth.signUp}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {notificationsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-title"
            className="w-full max-w-xl rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="notifications-title" className="text-xl font-extrabold text-gray-950">
                  Notifications
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Recent messages and work requests sent to you.
                </p>
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="rounded-2xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label={t.common.close}
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleDeleteAllNotifications}
                disabled={notificationsLoading || notificationsDeleting || notifications.length === 0}
                className={clsx(
                  'rounded-2xl px-4 py-2 text-sm font-bold transition-colors',
                  notificationsLoading || notificationsDeleting || notifications.length === 0
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                )}
              >
                {notificationsDeleting ? 'Deleting...' : 'Delete all notifications'}
              </button>
            </div>

            <div className="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {notificationsLoading ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  Loading notifications...
                </div>
              ) : null}

              {!notificationsLoading && notificationsError ? (
                <div className="rounded-[24px] border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium text-red-500">
                  {notificationsError}
                </div>
              ) : null}

              {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  No notifications yet.
                </div>
              ) : null}

              {!notificationsLoading && !notificationsError && notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={clsx(
                    'w-full rounded-[24px] border p-4 text-left shadow-sm transition-colors',
                    notification.read
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-primary/20 bg-primary-50/70 hover:bg-primary-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      notification.read ? 'bg-slate-100 text-slate-500' : 'bg-white text-primary'
                    )}>
                      <HiBell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-extrabold text-gray-950">
                          {notification.type === 'work_request' ? t.requests.workRequest : notification.title}
                        </p>
                        {!notification.read ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                        {notification.message || notification.body || 'New notification'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                        <span>{notification.type === 'work_request' ? 'Work request' : 'Message'}</span>
                        {notification.createdAt ? (
                          <span>{formatLocationDate(notification.createdAt)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {locationsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setLocationsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-locations-title"
            className="w-full max-w-xl rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="saved-locations-title" className="text-xl font-extrabold text-gray-950">
                  {locationTexts.title || 'Saved locations'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {locationTexts.subtitle || 'Choose from the places saved on your account.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddLocationOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:shadow-glow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  disabled={addingLocation}
                >
                  <HiPlus className="h-4 w-4" />
                  {addingLocation ? (locationTexts.adding || 'Adding...') : (locationTexts.addLocation || 'Add location')}
                </button>
                <button
                  type="button"
                  onClick={() => setLocationsOpen(false)}
                  className="rounded-2xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label={t.common.close}
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-950">
                        {locationTexts.currentLabel || 'Current location'}
                      </h3>
                      {profile?.activeLocationSource === 'current' && (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                          {locationTexts.active || 'Active'}
                        </span>
                      )}
                    </div>
                    {currentLocation.loading && (
                      <p className="mt-2 text-sm text-slate-500">
                        {locationTexts.currentLoading || 'Getting your current location...'}
                      </p>
                    )}
                    {!currentLocation.loading && currentLocation.error && (
                      <p className="mt-2 text-sm text-red-500">{currentLocation.error}</p>
                    )}
                    {!currentLocation.loading && !currentLocation.error && (
                      <p className="mt-2 text-sm text-slate-600">
                        {locationTexts.coordinates || 'Coordinates'}: {formatCoordinate(currentLocation.lat)}, {formatCoordinate(currentLocation.lng)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={loadCurrentLocation}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm transition-colors hover:text-primary"
                    aria-label={locationTexts.refreshCurrent || 'Refresh current location'}
                  >
                    <HiRefresh className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => handleSelectLocation({
                      id: 'current',
                      label: locationTexts.currentLabel || 'Current location',
                      lat: currentLocation.lat,
                      lng: currentLocation.lng,
                      source: 'current',
                    })}
                    disabled={currentLocation.loading || Boolean(currentLocation.error) || locationSavingId === 'current'}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-glow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {locationSavingId === 'current' ? (locationTexts.saving || 'Saving...') : (locationTexts.useThisLocation || 'Use this location')}
                  </button>
                </div>
              </div>

              {locationsLoading && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  {locationTexts.loading || 'Loading saved locations...'}
                </div>
              )}

              {!locationsLoading && locationsError && (
                <div className="rounded-[24px] border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium text-red-500">
                  {locationsError}
                </div>
              )}

              {!locationsLoading && !locationsError && locationsData.locations.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  {locationTexts.empty || 'No saved locations yet.'}
                </div>
              )}

              {!locationsLoading && !locationsError && locationsData.locations.map((locationItem) => {
                const isActive = locationsData.activeLocationId === locationItem.id;
                const updatedAt = locationItem.updatedAt || (isActive ? locationsData.activeLocationUpdatedAt : null);

                return (
                  <div
                    key={locationItem.id}
                    className={clsx(
                      'rounded-[24px] border p-4 shadow-sm transition-colors',
                      isActive
                        ? 'border-primary/20 bg-primary-50/70'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-950">
                            {locationItem.label || locationTexts.untitled || 'Saved place'}
                          </h3>
                          {isActive && profile?.activeLocationSource !== 'current' && (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                              {locationTexts.active || 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {locationTexts.coordinates || 'Coordinates'}: {formatCoordinate(locationItem.lat)}, {formatCoordinate(locationItem.lng)}
                        </p>
                        {updatedAt && (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {locationTexts.updated || 'Updated'}: {formatLocationDate(updatedAt)}
                          </p>
                        )}
                        <button
                          onClick={() => handleSelectLocation({
                            id: locationItem.id,
                            label: locationItem.label || locationTexts.untitled || 'Saved place',
                            lat: locationItem.lat,
                            lng: locationItem.lng,
                            source: 'saved',
                          })}
                          disabled={locationSavingId === locationItem.id || typeof locationItem.lat !== 'number' || typeof locationItem.lng !== 'number'}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-glow disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                          {isActive && profile?.activeLocationSource !== 'current'
                            ? <HiCheck className="h-4 w-4" />
                            : null}
                          {locationSavingId === locationItem.id
                            ? (locationTexts.saving || 'Saving...')
                            : isActive && profile?.activeLocationSource !== 'current'
                              ? (locationTexts.inUse || 'Currently in use')
                              : (locationTexts.useThisLocation || 'Use this location')}
                        </button>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                        <HiLocationMarker className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <CityMapPickerModal
        isOpen={addLocationOpen}
        initialLat={currentLocation.lat ?? profile?.activeSearchLat ?? null}
        initialLng={currentLocation.lng ?? profile?.activeSearchLng ?? null}
        initialCity=""
        allowAnyLocation
        showNameInput
        nameLabel={locationTexts.nameLabel || 'Location name'}
        namePlaceholder={locationTexts.namePlaceholder || 'Home, work, or any name'}
        eyebrow={locationTexts.addEyebrow || 'GPS'}
        title={locationTexts.addTitle || 'Add location'}
        subtitle={locationTexts.addSubtitle || 'Tap the map or use your current location, then save it.'}
        selectedLabel={locationTexts.addSelectedLabel || 'Selected location'}
        emptySelectionText={locationTexts.addEmptySelection || 'Tap on the map to choose a location'}
        onClose={() => setAddLocationOpen(false)}
        onConfirm={handleAddLocationConfirm}
      />
    </>
  );
}

function formatCoordinate(value) {
  return typeof value === 'number' ? value.toFixed(6) : '--';
}

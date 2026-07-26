import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import clsx from 'clsx';
import {
  FiArrowLeft,
  FiCheck,
  FiTrash2,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiMessageCircle,
  FiTag,
  FiUser,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  formatRequestDateTime,
  getRequestMediaItems,
  getRequestStatusClass,
  isPendingRequestExpired,
  normalizeRequestDocument,
} from '../../lib/request-utils';

function DetailStat({ icon: Icon, label, value, href }) {
  const isInternalLink = href?.startsWith('/');
  const content = <span className="font-bold text-slate-900">{value}</span>;

  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 truncate text-sm">{content}</div>
        </div>
      </div>
    </>
  );

  const className = 'rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm';
  return isInternalLink ? (
    <Link href={href} className={`${className} transition hover:border-primary/30 hover:bg-primary-50/30`}>
      {body}
    </Link>
  ) : href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${className} block transition hover:border-primary/30 hover:bg-primary-50/30`}>
      {body}
    </a>
  ) : (
    <div className={className}>
      {body}
    </div>
  );
}

function PersonCard({ href, openProfileLabel, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      {(href || children) ? (
        <div className="grid grid-cols-2 gap-2">
          {href ? (
            <Link href={href} className="inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[24px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FiUser className="h-4 w-4" />
              {openProfileLabel}
            </Link>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

async function updateIfDocumentExists(reference, data) {
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) await updateDoc(reference, data);
}

export default function RequestDetailsPage() {
  const router = useRouter();
  const { requestId } = router.query;
  const { user, loading } = useAuth();
  const { t, locale, dir } = useLanguage();
  const copy = t.requests;
  const [request, setRequest] = useState(null);
  const [requestMode, setRequestMode] = useState('sent');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [professionItems, setProfessionItems] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      const nextPath = typeof window === 'undefined' ? '/requests' : window.location.pathname + window.location.search;
      router.replace(`/auth/signin?next=${encodeURIComponent(nextPath)}`);
    }
  }, [loading, router, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfessionItems() {
      try {
        const snapshot = await getDoc(doc(db, 'metadata', 'professions'));
        if (!cancelled) setProfessionItems(snapshot.data()?.items || []);
      } catch (loadError) {
        console.error('Failed to load profession translations:', loadError);
      }
    }

    loadProfessionItems();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.uid || typeof requestId !== 'string' || !requestId.trim()) return;

    let cancelled = false;

    async function loadRequest() {
      setPageLoading(true);
      setError('');

      try {
        const sentDoc = await getDoc(doc(db, 'users', user.uid, 'requests', requestId));
        if (cancelled) return;

        if (sentDoc.exists()) {
          setRequest(normalizeRequestDocument(sentDoc.id, sentDoc.data()));
          setRequestMode('sent');
          return;
        }

        const receivedQuery = query(
          collection(db, 'users', user.uid, 'RequestToMe'),
          where('requestId', '==', requestId),
          limit(1)
        );
        const receivedSnap = await getDocs(receivedQuery);
        if (cancelled) return;

        if (!receivedSnap.empty) {
          const foundRequest = receivedSnap.docs[0];
          setRequest(normalizeRequestDocument(foundRequest.id, foundRequest.data()));
          setRequestMode('received');
          return;
        }

        setRequest(null);
        setError(copy.notFound);
      } catch (loadError) {
        if (!cancelled) {
          setRequest(null);
          setError(copy.detailsLoadError);
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    loadRequest();

    return () => {
      cancelled = true;
    };
  }, [copy.detailsLoadError, copy.notFound, requestId, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !request || !isPendingRequestExpired(request)) return;

    let cancelled = false;
    const statusUpdate = { status: 'expired', expiredAt: serverTimestamp() };

    async function expireRequest() {
      try {
        const updates = requestMode === 'received'
          ? [
            updateDoc(doc(db, 'users', user.uid, 'RequestToMe', request.id), statusUpdate),
            request.fromId ? updateIfDocumentExists(doc(db, 'users', request.fromId, 'requests', request.requestId), statusUpdate) : null,
          ]
          : [
            updateDoc(doc(db, 'users', user.uid, 'requests', request.id), statusUpdate),
            request.workerId ? updateIfDocumentExists(doc(db, 'users', request.workerId, 'RequestToMe', request.requestId), statusUpdate) : null,
          ];

        await Promise.allSettled(updates.filter(Boolean));
        if (!cancelled) setRequest((current) => (current ? { ...current, status: 'expired' } : current));
      } catch (expireError) {
        console.error('Failed to expire request:', expireError);
      }
    }

    expireRequest();
    return () => { cancelled = true; };
  }, [request, requestMode, user?.uid]);

  const mediaItems = useMemo(
    () => (request ? getRequestMediaItems(request).filter((item) => item?.url) : []),
    [request]
  );
  const otherUserId = requestMode === 'received' ? request?.fromId : request?.workerId;
  const otherUserName = requestMode === 'received' ? request?.fromName : request?.workerName;
  const roomId = user?.uid && otherUserId ? [user.uid, otherUserId].sort().join('_') : '';
  const mapHref = request?.mapUrl || (
    typeof request?.latitude === 'number' && typeof request?.longitude === 'number'
      ? `https://maps.google.com/?q=${request.latitude},${request.longitude}`
      : ''
  );
  const backHref = requestMode === 'received' ? '/requests?tab=received' : '/requests?tab=sent';
  const scheduleHref = user?.uid ? `/profile/${user.uid}/schedule` : '';
  const requestTitle = request?.title === 'Work Request'
    ? copy.workRequestFrom.replace('{name}', otherUserName || copy.unknownUser)
    : (request?.title || copy.workRequest);
  const professionLabel = useMemo(() => {
    const storedProfession = String(request?.profession || '').trim();
    if (!storedProfession) return copy.generalRequest;

    const normalizedProfession = storedProfession.toLowerCase();
    const matchedProfession = professionItems.find((item) => (
      [item.en, item.he, item.ar, item.value, item.logo, item.id]
        .some((value) => String(value || '').trim().toLowerCase() === normalizedProfession)
    ));

    return matchedProfession?.[locale] || matchedProfession?.en || matchedProfession?.he || matchedProfession?.ar || storedProfession;
  }, [copy.generalRequest, locale, professionItems, request?.profession]);

  async function handleRequestDecision(nextStatus) {
    if (!user?.uid || requestMode !== 'received' || request?.status !== 'pending' || !request?.requestId || !request?.id || actionLoading) return;

    setActionLoading(nextStatus);
    setError('');

    try {
      await Promise.all([
        updateDoc(doc(db, 'users', user.uid, 'RequestToMe', request.id), {
          status: nextStatus,
          respondedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', request.fromId, 'requests', request.requestId), {
          status: nextStatus,
          respondedAt: serverTimestamp(),
        }),
      ]);

      setRequest((current) => (current ? { ...current, status: nextStatus } : current));
      toast.success(nextStatus === 'accepted' ? copy.acceptedToast : copy.refusedToast);
    } catch (updateError) {
      setError(copy.updateError);
      toast.error(copy.updateError);
    } finally {
      setActionLoading('');
    }
  }

  async function handleCancelRequest() {
    if (!user?.uid || requestMode !== 'sent' || !request?.requestId || actionLoading) return;

    setActionLoading('cancelled');
    setError('');

    try {
      const deleteOperations = [];

      if (request.workerId) {
        deleteOperations.push(
          deleteDoc(doc(db, 'users', request.workerId, 'RequestToMe', request.requestId)),
          deleteDoc(doc(db, 'users', request.workerId, 'notifications', request.workerNotificationId || request.requestId))
        );
      }

      await Promise.all(deleteOperations);
      await updateDoc(doc(db, 'users', user.uid, 'requests', request.requestId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      });

      setRequest((current) => (current ? { ...current, status: 'cancelled' } : current));
      toast.success(copy.cancelledToast);
    } catch (cancelError) {
      setError(copy.cancelError);
      toast.error(copy.cancelError);
    } finally {
      setActionLoading('');
    }
  }

  if (loading || (!user && !loading)) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Hiro | {copy.detailsTitle}</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8" dir={dir}>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <FiArrowLeft className={clsx('h-4 w-4', dir === 'rtl' && 'rotate-180')} />
          {copy.back}
        </Link>

        {pageLoading ? (
          <div className="mt-6 rounded-[32px] border border-dashed border-slate-200 bg-white px-4 py-16 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[32px] border border-red-100 bg-red-50 px-5 py-10 text-center text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : request ? (
          <>
            <section className="mt-6 overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(126,178,232,0.22),_transparent_40%),linear-gradient(135deg,_#ffffff,_#f8fbff)] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{copy.detailsTitle}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{requestTitle}</h1>
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-bold capitalize ring-1', getRequestStatusClass(request.status))}>
                      {copy[request.status] || request.status}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-slate-700">
                    {request.jobDescription || request.body || copy.noDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{copy.created}</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {request.timestamp ? formatRequestDateTime(request.timestamp, locale) : copy.notAvailable}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {requestMode === 'received' ? copy.receivedNote : copy.sentNote}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <PersonCard
                href={otherUserId ? `/profile/${otherUserId}` : ''}
                openProfileLabel={copy.openProfile}
              >
                {roomId ? (
                  <Link
                    href={`/messages?roomId=${encodeURIComponent(roomId)}`}
                    className="inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[24px] bg-primary px-4 py-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    <FiMessageCircle className="h-4 w-4" />
                    {copy.openChat}
                  </Link>
                ) : null}
                {requestMode === 'sent' ? (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={Boolean(actionLoading) || request.status === 'cancelled'}
                    className={clsx(
                      'inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[24px] px-4 py-4 text-sm font-semibold transition',
                      Boolean(actionLoading) || request.status === 'cancelled'
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    )}
                  >
                    <FiTrash2 className="h-4 w-4" />
                    {actionLoading === 'cancelled' ? copy.cancelling : request.status === 'cancelled' ? copy.cancelled : copy.cancelRequest}
                  </button>
                ) : null}
                {requestMode === 'received' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRequestDecision('accepted')}
                      disabled={Boolean(actionLoading) || request.status !== 'pending'}
                      className={clsx(
                        'inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[24px] px-4 py-4 text-sm font-semibold text-white transition',
                        Boolean(actionLoading) || request.status !== 'pending'
                          ? 'cursor-not-allowed bg-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      )}
                    >
                      <FiCheck className="h-4 w-4" />
                      {actionLoading === 'accepted' ? copy.accepting : request.status === 'accepted' ? copy.accepted : copy.agree}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestDecision('declined')}
                      disabled={Boolean(actionLoading) || request.status !== 'pending'}
                      className={clsx(
                        'inline-flex min-h-[76px] items-center justify-center gap-2 rounded-[24px] px-4 py-4 text-sm font-semibold transition',
                        Boolean(actionLoading) || request.status !== 'pending'
                          ? 'cursor-not-allowed bg-rose-100 text-rose-300'
                          : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      )}
                    >
                      <FiX className="h-4 w-4" />
                      {actionLoading === 'declined' ? copy.refusing : request.status === 'declined' ? copy.refused : copy.refuse}
                    </button>
                  </>
                ) : null}
              </PersonCard>
              <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <DetailStat icon={FiCalendar} label={copy.date} value={request.date || copy.noDateSelected} href={scheduleHref} />
                <DetailStat
                  icon={FiClock}
                  label={copy.time}
                  value={request.requestedFrom && request.requestedTo ? `${request.requestedFrom} - ${request.requestedTo}` : copy.noTimeWindow}
                  href={scheduleHref}
                />
                <DetailStat icon={FiMapPin} label={copy.location} value={copy.openLocation} href={mapHref} />
                <DetailStat icon={FiTag} label={copy.profession} value={professionLabel} />
              </div>
            </section>

            <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{copy.media}</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{copy.mediaTitle}</h2>
                </div>
                <p className="text-sm font-semibold text-slate-400">
                  {mediaItems.length} {mediaItems.length === 1 ? copy.item : copy.items}
                </p>
              </div>

              {mediaItems.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500">
                  {copy.noMedia}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {mediaItems.map((item, index) => (
                    <a
                      key={`${item.url}-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="relative aspect-[4/3]">
                        {item.type === 'video' ? (
                          <video src={item.url} controls className="h-full w-full object-cover" />
                        ) : (
                          <Image
                            src={item.url}
                            alt={`${copy.media} ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
                        <span>{item.type === 'video' ? copy.video : copy.image}</span>
                        <span className="text-primary">{copy.open}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}

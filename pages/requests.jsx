import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  collection,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import clsx from 'clsx';
import { FiCalendar, FiClock, FiMapPin, FiMessageCircle, FiUser } from 'react-icons/fi';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  formatRequestDateTime,
  getRequestMediaItems,
  getRequestStatusClass,
  isPendingRequestExpired,
  isWorkRequest,
  normalizeRequestDocument,
} from '../lib/request-utils';

async function updateIfDocumentExists(reference, data) {
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) await updateDoc(reference, data);
}

function getStatusLabel(copy, status) {
  return copy[status] || status;
}

function RequestCard({ request, user, mode, highlighted, copy, locale }) {
  const router = useRouter();
  const mediaItems = getRequestMediaItems(request).slice(0, 5);
  const otherUserId = mode === 'received' ? request.fromId : request.workerId;
  const otherUserName = mode === 'received' ? request.fromName : request.workerName;
  const roomId = user?.uid && otherUserId ? [user.uid, otherUserId].sort().join('_') : '';
  const mapHref = request.mapUrl || (
    typeof request.latitude === 'number' && typeof request.longitude === 'number'
      ? `https://maps.google.com/?q=${request.latitude},${request.longitude}`
      : ''
  );
  const detailsHref = `/requests/${encodeURIComponent(request.requestId)}?tab=${encodeURIComponent(mode)}`;

  function handleCardClick(event) {
    if (event.target instanceof Element && event.target.closest('a, button')) return;
    router.push(detailsHref);
  }

  function handleCardKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      router.push(detailsHref);
    }
  }

  return (
    <article
      id={`request-${request.requestId}`}
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={clsx(
        'cursor-pointer rounded-[28px] border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/10 sm:p-5',
        highlighted ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-950">
              {isWorkRequest(request) ? copy.workRequest : request.title}
            </h2>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-bold capitalize ring-1', getRequestStatusClass(request.status))}>
              {getStatusLabel(copy, request.status)}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {mode === 'received' ? `${copy.from} ${otherUserName}` : `${copy.to} ${otherUserName}`}
          </p>
          {request.timestamp ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{formatRequestDateTime(request.timestamp, locale)}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={detailsHref}
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-100"
          >
            {copy.viewDetails}
          </Link>
          {otherUserId ? (
            <Link
              href={`/profile/${otherUserId}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiUser className="h-4 w-4" />
              {copy.profile}
            </Link>
          ) : null}
          {roomId ? (
            <Link
              href={`/messages?roomId=${encodeURIComponent(roomId)}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              <FiMessageCircle className="h-4 w-4" />
              {copy.chat}
            </Link>
          ) : null}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        {request.jobDescription || request.body || copy.noDescription}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <FiCalendar className="h-4 w-4 text-primary" />
          <span className="font-semibold text-slate-800">{request.date || copy.noDate}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <FiClock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-slate-800">
            {request.requestedFrom && request.requestedTo ? `${request.requestedFrom} - ${request.requestedTo}` : copy.noTime}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
          <FiMapPin className="h-4 w-4 text-primary" />
          {mapHref ? (
            <a href={mapHref} target="_blank" rel="noreferrer" className="truncate font-semibold text-slate-800 hover:text-primary">
              {copy.openLocation}
            </a>
          ) : (
            <span className="truncate font-semibold text-slate-800">{request.locationName || copy.noLocation}</span>
          )}
        </div>
      </div>

      {mediaItems.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {mediaItems.map((item, index) => (
            <a
              key={`${item.url || index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
            >
              <div className="relative aspect-square">
                {item.type === 'video' ? (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                ) : (
                  <Image src={item.url} alt="" fill sizes="140px" className="object-cover" />
                )}
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function RequestsPage() {
  const router = useRouter();
  const { user, loading, isWorker } = useAuth();
  const { t, locale, dir } = useLanguage();
  const copy = t.requests;
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('sent');
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState('');
  const focusedRequestId = typeof router.query.requestId === 'string' ? router.query.requestId : '';
  const requestedTab = typeof router.query.tab === 'string' ? router.query.tab : '';

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/requests')}`);
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadRequests() {
      setLoadingRequests(true);
      setError('');

      try {
        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'requests')),
          getDocs(collection(db, 'users', user.uid, 'RequestToMe')),
        ]);

        if (cancelled) return;

        const sortByNewest = (items) => items.sort((a, b) => {
          const aTime = a.timestamp?.getTime?.() || 0;
          const bTime = b.timestamp?.getTime?.() || 0;
          return bTime - aTime;
        });

        const sentRequests = sentSnap.docs
          .map((requestDoc) => normalizeRequestDocument(requestDoc.id, requestDoc.data()))
          .filter((request) => request.type === 'work_request' && request.fromId === user.uid);
        const receivedRequests = receivedSnap.docs
          .map((requestDoc) => normalizeRequestDocument(requestDoc.id, requestDoc.data()))
          .filter((request) => request.type === 'work_request' && request.workerId === user.uid);

        const expiredSentRequests = sentRequests.filter((request) => isPendingRequestExpired(request));
        const expiredReceivedRequests = receivedRequests.filter((request) => isPendingRequestExpired(request));

        if (expiredSentRequests.length || expiredReceivedRequests.length) {
          const statusUpdate = { status: 'expired', expiredAt: serverTimestamp() };
          await Promise.allSettled([
            ...expiredSentRequests.flatMap((request) => [
              updateDoc(doc(db, 'users', user.uid, 'requests', request.id), statusUpdate),
              request.workerId ? updateIfDocumentExists(doc(db, 'users', request.workerId, 'RequestToMe', request.requestId), statusUpdate) : null,
            ]),
            ...expiredReceivedRequests.flatMap((request) => [
              updateDoc(doc(db, 'users', user.uid, 'RequestToMe', request.id), statusUpdate),
              request.fromId ? updateIfDocumentExists(doc(db, 'users', request.fromId, 'requests', request.requestId), statusUpdate) : null,
            ]),
          ].filter(Boolean));
        }

        const withExpiredStatus = (items) => items.map((request) => (
          isPendingRequestExpired(request) ? { ...request, status: 'expired' } : request
        ));

        setSentRequests(sortByNewest(withExpiredStatus(sentRequests)));
        setReceivedRequests(sortByNewest(withExpiredStatus(receivedRequests)));
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load requests:', loadError);
          setError(copy.loadError);
        }
      } finally {
        if (!cancelled) setLoadingRequests(false);
      }
    }

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, [copy.loadError, user?.uid]);

  useEffect(() => {
    if (isWorker) setActiveTab('received');
  }, [isWorker]);

  useEffect(() => {
    if (requestedTab === 'sent' || requestedTab === 'received') {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!focusedRequestId || loadingRequests) return;

    const receivedMatch = receivedRequests.some((request) => request.requestId === focusedRequestId);
    const sentMatch = sentRequests.some((request) => request.requestId === focusedRequestId);

    if (receivedMatch) {
      setActiveTab('received');
    } else if (sentMatch) {
      setActiveTab('sent');
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`request-${focusedRequestId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [focusedRequestId, loadingRequests, receivedRequests, sentRequests]);

  const activeRequests = activeTab === 'received' ? receivedRequests : sentRequests;
  const emptyText = activeTab === 'received'
    ? copy.noReceived
    : copy.noSent;

  const stats = useMemo(() => {
    const requestsInActiveTab = activeTab === 'received' ? receivedRequests : sentRequests;
    return {
      total: requestsInActiveTab.length,
      pending: requestsInActiveTab.filter((request) => request.status === 'pending').length,
      accepted: requestsInActiveTab.filter((request) => request.status === 'accepted').length,
    };
  }, [activeTab, receivedRequests, sentRequests]);

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
        <title>Hiro | {copy.title}</title>
      </Head>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8" dir={dir}>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{copy.title}</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <div className="rounded-2xl bg-slate-50 p-3 text-center">
              <p className="text-xs font-semibold text-slate-500">{copy.total}</p>
              <p className="text-xl font-extrabold text-slate-950">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <p className="text-xs font-semibold text-amber-700">{copy.pending}</p>
              <p className="text-xl font-extrabold text-amber-800">{stats.pending}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-center">
              <p className="text-xs font-semibold text-emerald-700">{copy.accepted}</p>
              <p className="text-xl font-extrabold text-emerald-800">{stats.accepted}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={clsx(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition',
              activeTab === 'sent' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'
            )}
          >
            {copy.sent} ({sentRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={clsx(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition',
              activeTab === 'received' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-950'
            )}
          >
            {copy.received} ({receivedRequests.length})
          </button>
        </div>

        {loadingRequests ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-14 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-100 bg-red-50 px-4 py-8 text-center text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : activeRequests.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-600">{emptyText}</p>
            <Link
              href="/search"
              className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
            >
              {copy.findProfessional}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeRequests.map((request) => (
              <RequestCard
                key={`${activeTab}-${request.requestId}`}
                request={request}
                user={user}
                mode={activeTab}
                highlighted={request.requestId === focusedRequestId}
                copy={copy}
                locale={locale}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

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
import {
  formatRequestDateTime,
  getRequestMediaItems,
  getRequestStatusClass,
  normalizeRequestDocument,
} from '../../lib/request-utils';

function DetailStat({ icon: Icon, label, value, href }) {
  const content = href ? (
    <a href={href} target="_blank" rel="noreferrer" className="font-bold text-slate-900 hover:text-primary">
      {value}
    </a>
  ) : (
    <span className="font-bold text-slate-900">{value}</span>
  );

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 truncate text-sm">{content}</div>
        </div>
      </div>
    </div>
  );
}

function PersonCard({ label, name, href, town }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-slate-950">{name}</p>
      {town ? (
        <p className="mt-1 text-sm font-medium text-slate-500">{town}</p>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FiUser className="h-4 w-4" />
          Open profile
        </Link>
      ) : null}
    </div>
  );
}

export default function RequestDetailsPage() {
  const router = useRouter();
  const { requestId } = router.query;
  const { user, loading } = useAuth();
  const [request, setRequest] = useState(null);
  const [requestMode, setRequestMode] = useState('sent');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      const nextPath = typeof window === 'undefined' ? '/requests' : window.location.pathname + window.location.search;
      router.replace(`/auth/signin?next=${encodeURIComponent(nextPath)}`);
    }
  }, [loading, router, user]);

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
        setError('We could not find that request.');
      } catch (loadError) {
        if (!cancelled) {
          setRequest(null);
          setError('Could not load request details right now.');
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    loadRequest();

    return () => {
      cancelled = true;
    };
  }, [requestId, user?.uid]);

  const mediaItems = useMemo(
    () => (request ? getRequestMediaItems(request).filter((item) => item?.url) : []),
    [request]
  );
  const otherUserId = requestMode === 'received' ? request?.fromId : request?.workerId;
  const otherUserName = requestMode === 'received' ? request?.fromName : request?.workerName;
  const otherUserLabel = requestMode === 'received' ? 'Requested by' : 'Assigned to';
  const roomId = user?.uid && otherUserId ? [user.uid, otherUserId].sort().join('_') : '';
  const mapHref = request?.mapUrl || (
    typeof request?.latitude === 'number' && typeof request?.longitude === 'number'
      ? `https://maps.google.com/?q=${request.latitude},${request.longitude}`
      : ''
  );
  const backHref = requestMode === 'received' ? '/requests?tab=received' : '/requests?tab=sent';

  async function handleRequestDecision(nextStatus) {
    if (!user?.uid || requestMode !== 'received' || !request?.requestId || !request?.id || actionLoading) return;

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
      toast.success(nextStatus === 'accepted' ? 'Request accepted.' : 'Request refused.');
    } catch (updateError) {
      setError('Could not update the request status right now.');
      toast.error('Could not update the request status right now.');
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
      toast.success('Request cancelled.');
    } catch (cancelError) {
      setError('Could not cancel the request right now.');
      toast.error('Could not cancel the request right now.');
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
        <title>Hiro | Request details</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to requests
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
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Request Details</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{request.title}</h1>
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-bold capitalize ring-1', getRequestStatusClass(request.status))}>
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-slate-700">
                    {request.jobDescription || request.body || 'No job description was added.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {requestMode === 'received' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRequestDecision('accepted')}
                          disabled={Boolean(actionLoading) || request.status === 'accepted'}
                          className={clsx(
                            'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition',
                            Boolean(actionLoading) || request.status === 'accepted'
                              ? 'cursor-not-allowed bg-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          )}
                        >
                          <FiCheck className="h-4 w-4" />
                          {actionLoading === 'accepted' ? 'Accepting...' : request.status === 'accepted' ? 'Accepted' : 'Agree'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDecision('declined')}
                          disabled={Boolean(actionLoading) || request.status === 'declined'}
                          className={clsx(
                            'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                            Boolean(actionLoading) || request.status === 'declined'
                              ? 'cursor-not-allowed bg-rose-100 text-rose-300'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          )}
                        >
                          <FiX className="h-4 w-4" />
                          {actionLoading === 'declined' ? 'Refusing...' : request.status === 'declined' ? 'Refused' : 'Refuse'}
                        </button>
                      </>
                    ) : null}
                    {requestMode === 'sent' ? (
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={Boolean(actionLoading) || request.status === 'cancelled'}
                        className={clsx(
                          'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                          Boolean(actionLoading) || request.status === 'cancelled'
                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        )}
                      >
                        <FiTrash2 className="h-4 w-4" />
                        {actionLoading === 'cancelled' ? 'Cancelling...' : request.status === 'cancelled' ? 'Cancelled' : 'Cancel request'}
                      </button>
                    ) : null}
                    {roomId ? (
                      <Link
                        href={`/messages?roomId=${encodeURIComponent(roomId)}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                      >
                        <FiMessageCircle className="h-4 w-4" />
                        Open chat
                      </Link>
                    ) : null}
                    {mapHref ? (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiMapPin className="h-4 w-4" />
                        Open location
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Created</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {request.timestamp ? formatRequestDateTime(request.timestamp) : 'Not available'}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {requestMode === 'received' ? 'This request was sent to you.' : 'This is a request you created.'}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailStat icon={FiCalendar} label="Date" value={request.date || 'No date selected'} />
              <DetailStat
                icon={FiClock}
                label="Time"
                value={request.requestedFrom && request.requestedTo ? `${request.requestedFrom} - ${request.requestedTo}` : 'No time window'}
              />
              <DetailStat icon={FiMapPin} label="Location" value={request.locationName || 'No location added'} href={mapHref} />
              <DetailStat icon={FiTag} label="Profession" value={request.profession || 'General request'} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <PersonCard
                label={otherUserLabel}
                name={otherUserName || 'Unknown user'}
                href={otherUserId ? `/profile/${otherUserId}` : ''}
                town={requestMode === 'received' ? request.fromLocation : ''}
              />
              <PersonCard
                label="Request type"
                name={request.serviceLocationType === 'provider_travels' ? 'Professional travels to customer' : 'Custom arrangement'}
                town={request.body && request.body !== request.jobDescription ? request.body : ''}
              />
            </section>

            <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Media</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Images and attachments</h2>
                </div>
                <p className="text-sm font-semibold text-slate-400">{mediaItems.length} item{mediaItems.length === 1 ? '' : 's'}</p>
              </div>

              {mediaItems.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500">
                  No media was attached to this request.
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
                            alt={`Request media ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
                        <span className="capitalize">{item.type || 'media'}</span>
                        <span className="text-primary">Open</span>
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

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiCalendar, FiClock, FiDollarSign, FiExternalLink, FiEye, FiFileText, FiMapPin, FiMoreVertical, FiSend, FiStar } from 'react-icons/fi';
import { HiChat, HiHeart } from 'react-icons/hi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCommunityPostSeo } from '../../lib/page-seo';
import { absoluteUrl } from '../../lib/seo-locale';
import {
  getBlogPost,
  getBlogComments,
  createBlogComment,
  getUserProfile,
  toggleBlogPostLike,
} from '../../lib/firestore';

const CATEGORY_LABELS = {
  tip: 'Tip',
  request: 'Request',
  question: 'Question',
  '\u05d8\u05d9\u05e4': 'Tip',
  '\u05d1\u05e7\u05e9\u05d4': 'Request',
  '\u05e9\u05d0\u05dc\u05d4': 'Question',
};

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(value) {
  const date = normalizeDateValue(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrencyValue(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return '₪' + amount;
  }
}

function formatShortDate(value) {
  const date = normalizeDateValue(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateRange(from, to) {
  const start = formatShortDate(from);
  const end = formatShortDate(to);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

function formatHourRange(from, to) {
  if (from && to) return `${from} - ${to}`;
  return from || to || '';
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceValue(distanceKm) {
  if (distanceKm === null || Number.isNaN(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString();
}

function getMediaKind(item) {
  if (!item) return 'image';
  if (item.type === 'video') return 'video';
  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';
  return 'image';
}

export default function BlogPostPage() {
  const router = useRouter();
  const { postId } = router.query;
  const { dir } = useLanguage();
  const { user, profile } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentProfiles, setCommentProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [bidPriceInput, setBidPriceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const mediaCarouselRef = useRef(null);

  useEffect(function () {
    if (!postId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [postData, commentData] = await Promise.all([
          getBlogPost(postId),
          getBlogComments(postId),
        ]);
        const commentAuthorUids = Array.from(new Set(
          commentData
            .map(function (comment) { return comment.authorUid; })
            .filter(Boolean)
        ));
        const profileEntries = await Promise.all(
          commentAuthorUids.map(async function (uid) {
            try {
              const userProfile = await getUserProfile(uid);
              return [uid, userProfile];
            } catch (error) {
              return [uid, null];
            }
          })
        );
        setPost(postData);
        setComments(commentData);
        setCommentProfiles(Object.fromEntries(profileEntries));
      } catch (error) {
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [postId]);

  const hasLiked = useMemo(function () {
    if (!user || !post) return false;
    const likedByArr = Array.isArray(post.likedBy) ? post.likedBy : [];
    return likedByArr.includes(user.uid);
  }, [post, user]);

  const bidComments = useMemo(function () {
    return comments.filter(function (comment) {
      return comment.isBid && typeof comment.bidPrice === 'number';
    });
  }, [comments]);

  const bidStats = useMemo(function () {
    if (bidComments.length === 0) {
      return { lowest: null, highest: null };
    }

    const prices = bidComments.map(function (comment) { return comment.bidPrice; });
    return {
      lowest: Math.min.apply(null, prices),
      highest: Math.max.apply(null, prices),
    };
  }, [bidComments]);

  const distanceLabel = useMemo(function () {
    if (
      !post ||
      typeof post.locationLat !== 'number' ||
      typeof post.locationLng !== 'number' ||
      typeof profile?.lat !== 'number' ||
      typeof profile?.lng !== 'number'
    ) {
      return '';
    }

    return formatDistanceValue(haversineKm(profile.lat, profile.lng, post.locationLat, post.locationLng));
  }, [post, profile]);

  const mediaTypes = useMemo(function () {
    if (!post) return [];
    if (Array.isArray(post.mediaTypes) && post.mediaTypes.length > 0) return post.mediaTypes;
    if (post.imageUrl) return [{ url: post.imageUrl, type: 'image' }];
    return [];
  }, [post]);
  const seo = getCommunityPostSeo(post);
  const canonicalUrl = postId ? absoluteUrl(`/community/${postId}`) : absoluteUrl('/community');

  useEffect(function () {
    setActiveMediaIndex(0);
    if (mediaCarouselRef.current) {
      mediaCarouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [postId, mediaTypes.length]);

  function scrollToMedia(index) {
    const container = mediaCarouselRef.current;
    if (!container || mediaTypes.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, mediaTypes.length - 1));
    container.scrollTo({
      left: container.clientWidth * safeIndex,
      behavior: 'smooth',
    });
    setActiveMediaIndex(safeIndex);
  }

  function handleMediaScroll() {
    const container = mediaCarouselRef.current;
    if (!container || container.clientWidth === 0) return;
    const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
    if (nextIndex !== activeMediaIndex) {
      setActiveMediaIndex(nextIndex);
    }
  }

  function openLightbox(index) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  async function handleLike() {
    if (!user || !post) {
      toast.error('Sign in to like posts');
      return;
    }

    const likedByArr = Array.isArray(post.likedBy) ? post.likedBy : [];
    const nowLiked = !likedByArr.includes(user.uid);
    const nextLikedBy = nowLiked
      ? [...likedByArr, user.uid]
      : likedByArr.filter(function (id) { return id !== user.uid; });

    setPost(function (prev) {
      if (!prev) return prev;
      return {
        ...prev,
        likedBy: nextLikedBy,
        likes: (prev.likes || 0) + (nowLiked ? 1 : -1),
      };
    });

    try {
      await toggleBlogPostLike(post.id, user.uid, !nowLiked);
    } catch (error) {
      toast.error('Could not update like');
    }
  }

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to comment');
      return;
    }
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const normalizedBidPrice = Number(bidPriceInput);
      const payload = {
        postId: post.id,
        authorUid: user.uid,
        authorName: (profile && profile.name) || user.displayName || 'Anonymous',
        authorRole: (profile && profile.role) || '',
        text: commentText.trim(),
        content: commentText.trim(),
        isBid: post.isJobRequest && Number.isFinite(normalizedBidPrice) && normalizedBidPrice > 0,
        bidPrice:
          post.isJobRequest && Number.isFinite(normalizedBidPrice) && normalizedBidPrice > 0
            ? normalizedBidPrice
            : null,
      };

      await createBlogComment(payload);

      const nextComment = {
        id: 'local_' + Date.now(),
        ...payload,
        timestamp: new Date(),
      };

      setComments(function (prev) { return [...prev, nextComment]; });
      setCommentProfiles(function (prev) {
        return {
          ...prev,
          [user.uid]: profile || prev[user.uid] || null,
        };
      });
      setPost(function (prev) {
        if (!prev) return prev;
        return { ...prev, commentsCount: (prev.commentsCount || 0) + 1 };
      });
      setCommentText('');
      setBidPriceInput('');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {post?.imageUrl ? <meta property="og:image" content={post.imageUrl} /> : null}
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <div className="min-h-screen bg-[#edf4fb]" dir={dir}>
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
          <div className="mb-6 flex items-center justify-between rounded-b-[24px] bg-white px-2 py-2 shadow-sm">
            <Link href="/community" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-900 hover:bg-slate-50">
              <FiArrowLeft className="h-5 w-5" />
            </Link>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-900 hover:bg-slate-50">
              <FiMoreVertical className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          ) : !post ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">Post not found.</p>
            </div>
          ) : (
            <>
              <article className="mx-auto max-w-3xl rounded-[28px] border border-[#d7e4f3] bg-[#edf4fb] pb-6">
                <div className="rounded-[28px] bg-[#edf4fb] px-4 pb-2 pt-4 md:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dce9f8] text-xl font-black text-primary md:h-12 md:w-12">
                        {String(post.authorName || 'T').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">{post.authorName || 'Anonymous'}</p>
                        <p className="mt-1 text-sm font-bold text-slate-500 md:text-base">{formatDateValue(post.timestamp)} {normalizeDateValue(post.timestamp) ? normalizeDateValue(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleLike}
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-[18px] border px-4 py-2 text-base font-extrabold transition-colors',
                        hasLiked
                          ? 'border-rose-200 bg-rose-50 text-rose-500'
                          : 'border-rose-200 bg-white/80 text-rose-600 hover:bg-rose-50'
                      )}
                    >
                      <HiHeart className="h-5 w-5" />
                      {post.likes || 0}
                    </button>
                  </div>

                  <div className="mt-5 inline-flex items-center rounded-2xl bg-[#dcebfb] px-3 py-1.5 text-sm font-black text-primary md:text-base">
                    {(post.rawCategory || 'Job Request')}{post.professionLabel || post.profession ? ` • ${post.professionLabel || post.profession}` : ''}
                  </div>

                  <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-4xl">{post.title}</h1>

                  {mediaTypes.length > 0 && (
                    <div className="mt-6">
                      <div className="relative">
                        <div
                          ref={mediaCarouselRef}
                          onScroll={handleMediaScroll}
                          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide rounded-[24px]"
                        >
                          {mediaTypes.map(function (item, index) {
                            return (
                              <div
                                key={item.url + '_' + index}
                                className="relative h-56 w-full shrink-0 snap-center overflow-hidden bg-white shadow-sm md:h-72"
                              >
                                {getMediaKind(item) === 'video' ? (
                              <video
                                src={item.url}
                                controls
                                playsInline
                                preload="metadata"
                                className="h-full w-full bg-black object-contain"
                              >
                                Your browser does not support video playback.
                              </video>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={function () { openLightbox(index); }}
                                    className="relative block h-full w-full"
                                  >
                                    <Image src={item.url} alt={post.title} fill className="object-cover" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {mediaTypes.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={function () { scrollToMedia(activeMediaIndex - 1); }}
                              disabled={activeMediaIndex === 0}
                              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-white transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {'<'}
                            </button>
                            <button
                              type="button"
                              onClick={function () { scrollToMedia(activeMediaIndex + 1); }}
                              disabled={activeMediaIndex === mediaTypes.length - 1}
                              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-white transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {'>'}
                            </button>
                          </>
                        )}
                      </div>

                      {mediaTypes.length > 1 && (
                        <div className="mt-3 flex items-center justify-center gap-2">
                          {mediaTypes.map(function (item, index) {
                            return (
                              <button
                                key={item.url + '_dot_' + index}
                                type="button"
                                onClick={function () { scrollToMedia(index); }}
                                className={clsx(
                                  'h-2.5 rounded-full transition-all',
                                  index === activeMediaIndex ? 'w-6 bg-primary' : 'w-2.5 bg-slate-300'
                                )}
                                aria-label={`Go to media ${index + 1}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-4 text-base leading-relaxed text-slate-700 shadow-sm md:text-lg">
                    {post.content}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0fb] text-primary">
                            <FiMapPin className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-500 md:text-base">Location (City/Area)</p>
                            <p className="mt-1 text-lg font-black text-slate-900 md:text-xl">
                              {post.location}
                              {distanceLabel ? ` • ${distanceLabel}` : ''}
                            </p>
                          </div>
                        </div>
                        <a
                          href={post.locationLat && post.locationLng ? `https://maps.google.com/?q=${post.locationLat},${post.locationLng}` : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={clsx(
                            'inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400',
                            post.locationLat && post.locationLng ? 'hover:bg-slate-50 hover:text-primary' : 'pointer-events-none opacity-50'
                          )}
                        >
                          <FiExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                    </div>

                    {(post.requestDateFrom || post.requestDateTo) && (
                      <div className="rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0fb] text-primary">
                              <FiCalendar className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-slate-500 md:text-base">From date</p>
                              <p className="mt-1 text-lg font-black text-slate-900 md:text-xl">{formatDateRange(post.requestDateFrom, post.requestDateTo)}</p>
                            </div>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400">
                            <FiExternalLink className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {(post.requestHourFrom || post.requestHourTo) && (
                      <div className="rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0fb] text-primary">
                              <FiClock className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-slate-500 md:text-base">Preferred time</p>
                              <p className="mt-1 text-lg font-black text-slate-900 md:text-xl">{formatHourRange(post.requestHourFrom, post.requestHourTo)}</p>
                            </div>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400">
                            <FiClock className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-[24px] border border-[#b9d8fb] bg-[#dcecfb] p-4 shadow-sm">
                      <div className="rounded-[20px] bg-white px-5 py-4">
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                          <div className="pr-4">
                            <p className="text-sm font-extrabold text-slate-500 md:text-base">Lowest offer</p>
                            <p className="mt-2 text-xl font-black text-primary md:text-2xl">{bidStats.lowest !== null ? formatCurrencyValue(bidStats.lowest) : '--'}</p>
                          </div>
                          <div className="pl-4">
                            <p className="text-sm font-extrabold text-slate-500 md:text-base">Highest offer</p>
                            <p className="mt-2 text-xl font-black text-primary md:text-2xl">{bidStats.highest !== null ? formatCurrencyValue(bidStats.highest) : '--'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[#d7e4f3] pt-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Comments</h2>
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#dcebfb] px-3 text-sm font-black text-primary md:text-base">
                        {post.commentsCount || comments.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <section className="mx-auto mt-6 max-w-3xl space-y-4">
                {comments.length === 0 ? (
                  <p className="rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-4 text-base text-slate-500 shadow-sm">No comments yet.</p>
                ) : (
                  comments.map(function (comment) {
                    const hasQuoteItems = Array.isArray(comment.quoteItems) && comment.quoteItems.length > 0;
                    const commentProfile = comment.authorUid ? commentProfiles[comment.authorUid] : null;

                    return (
                      <div key={comment.id} className="rounded-[24px] border border-[#d7e4f3] bg-white px-5 py-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {commentProfile?.profileImageUrl ? (
                              <Image
                                src={commentProfile.profileImageUrl}
                                alt={comment.authorName || 'Comment author'}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dce9f8] text-lg font-black text-primary">
                                {String(comment.authorName || 'A').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-lg font-black text-slate-950 md:text-xl">{comment.authorName || 'Anonymous'}</p>
                              {commentProfile && (
                                <div className="mt-2 flex items-center gap-2 text-slate-500">
                                  <FiStar className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  <span className="text-base font-black text-slate-700">{Number(commentProfile.avgRating || 0).toFixed(1)}</span>
                                  <span className="text-base">({commentProfile.reviewCount || 0})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {comment.isBid && comment.bidPrice !== null ? (
                            <p className="text-xl font-black text-primary md:text-2xl">{formatCurrencyValue(comment.bidPrice)}</p>
                          ) : (
                            <p className="text-sm font-semibold text-slate-400">{timeAgo(comment.timestamp)}</p>
                          )}
                        </div>

                        {comment.text && (
                          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-700 md:text-lg">{comment.text}</p>
                        )}

                        {hasQuoteItems && (
                          <div className="mt-4 rounded-[20px] bg-[#f5f9ff] p-4">
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Quote items</p>
                            <div className="mt-3 space-y-3">
                              {comment.quoteItems.map(function (item, index) {
                                const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);

                                return (
                                  <div key={index} className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-base font-bold text-slate-800">{item.description || 'Item'}</p>
                                      <p className="text-sm text-slate-500">Qty {item.quantity || 0}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-base font-black text-slate-800">{formatCurrencyValue(Number(item.price) || 0)}</p>
                                      {lineTotal > 0 && <p className="text-sm text-slate-500">{formatCurrencyValue(lineTotal)}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {comment.quoteUrl && (
                          <div className="mt-5">
                            <a
                              href={comment.quoteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-base font-black text-primary hover:text-primary/80 md:text-lg"
                            >
                              <FiEye className="h-5 w-5" />
                              View quote
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </section>

              <section className="sticky bottom-0 mx-auto mt-8 max-w-3xl rounded-t-[24px] border border-[#d7e4f3] bg-white px-4 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  {post.isJobRequest && (
                    <div className="flex items-center gap-3 rounded-[20px] border border-[#d7e4f3] bg-[#f8fbff] px-4 py-3">
                      <FiDollarSign className="h-5 w-5 text-primary" />
                      <input
                        value={bidPriceInput}
                        onChange={function (e) { setBidPriceInput(e.target.value.replace(/[^\d.]/g, '')); }}
                        inputMode="decimal"
                        placeholder="Bid Price"
                        className="flex-1 bg-transparent text-base text-slate-700 placeholder:text-slate-400 focus:outline-none md:text-lg"
                      />
                      <FiFileText className="h-5 w-5 text-primary" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <textarea
                      value={commentText}
                      onChange={function (e) { setCommentText(e.target.value); }}
                      placeholder={user ? 'Add a comment or offer...' : 'Sign in to write a comment'}
                      rows={1}
                      disabled={!user || submitting}
                      className="min-h-[60px] flex-1 resize-none rounded-[22px] border border-[#d7e4f3] bg-[#f8fbff] px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 md:text-lg"
                    />
                    <button
                      type="submit"
                      disabled={!user || submitting || !commentText.trim()}
                      className={clsx(
                        'inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition-all',
                        !user || submitting || !commentText.trim()
                          ? 'bg-slate-200'
                          : 'bg-primary shadow-lg shadow-primary/25 hover:scale-105'
                      )}
                    >
                      <FiSend className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              </section>

              {lightboxIndex !== null && mediaTypes[lightboxIndex] && getMediaKind(mediaTypes[lightboxIndex]) === 'image' && (
                <div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
                  onClick={closeLightbox}
                >
                  <button
                    type="button"
                    onClick={closeLightbox}
                    className="absolute right-4 top-4 z-[81] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white transition hover:bg-white/20"
                  >
                    ×
                  </button>
                  <div
                    className="relative h-[85vh] w-full max-w-5xl"
                    onClick={function (e) { e.stopPropagation(); }}
                  >
                    <Image
                      src={mediaTypes[lightboxIndex].url}
                      alt={post?.title || 'Post image'}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

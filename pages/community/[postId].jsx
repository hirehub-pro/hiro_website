import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiDollarSign, FiExternalLink, FiEye, FiFileText, FiMapPin, FiMoreVertical, FiSend, FiStar } from 'react-icons/fi';
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

function getInitials(name) {
  const parts = String(name || 'Anonymous').trim().split(/\s+/).filter(Boolean);
  const initials = parts.map(function (part) { return part.charAt(0); }).join('').slice(0, 2);
  return initials.toUpperCase() || 'A';
}

export default function BlogPostPage() {
  const router = useRouter();
  const { postId } = router.query;
  const { t, dir } = useLanguage();
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
  const postDate = post ? normalizeDateValue(post.timestamp) : null;
  const postTimeLabel = postDate ? postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const rawCategory = String(post?.rawCategory || '').trim().toLowerCase();
  const categoryLabel = post
    ? (
      post.isJobRequest || post.category === 'request' || rawCategory === 'job request'
        ? t.community.jobRequest
        : (post.rawCategory || CATEGORY_LABELS[post.category] || t.community.other)
    )
    : '';
  const professionLabel = post ? (post.professionLabel || post.profession || '') : '';
  const commentCount = post ? (post.commentsCount || comments.length || 0) : 0;
  const requestInfoItems = post ? [
    post.location ? {
      label: 'Location',
      value: [post.location, distanceLabel].filter(Boolean).join(' • '),
      icon: FiMapPin,
      action: post.locationLat && post.locationLng ? `https://maps.google.com/?q=${post.locationLat},${post.locationLng}` : '',
    } : null,
    (post.requestDateFrom || post.requestDateTo) ? {
      label: 'Date',
      value: formatDateRange(post.requestDateFrom, post.requestDateTo),
      icon: FiCalendar,
    } : null,
    (post.requestHourFrom || post.requestHourTo) ? {
      label: 'Time',
      value: formatHourRange(post.requestHourFrom, post.requestHourTo),
      icon: FiClock,
    } : null,
  ].filter(Boolean) : [];

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

      <div className="min-h-screen bg-[#f4f8fc]" dir={dir}>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:pb-28 md:pt-6">
          <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-200/70 bg-[#f4f8fc]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
            <div className="flex items-center justify-between">
              <Link href="/community" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:border-primary/30 hover:text-primary">
                <FiArrowLeft className="h-5 w-5" />
              </Link>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950">
                <FiMoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mx-auto max-w-4xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-5 h-64 animate-pulse rounded-[20px] bg-slate-100" />
              <div className="mt-5 h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            </div>
          ) : !post ? (
            <div className="mx-auto max-w-2xl rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-slate-600">Post not found.</p>
            </div>
          ) : (
            <>
              <article className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                {mediaTypes.length > 0 && (
                  <div className="relative bg-slate-950">
                    <div
                      ref={mediaCarouselRef}
                      onScroll={handleMediaScroll}
                      className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
                    >
                      {mediaTypes.map(function (item, index) {
                        return (
                          <div
                            key={item.url + '_' + index}
                            className="relative aspect-[4/3] w-full shrink-0 snap-center overflow-hidden bg-slate-950 md:aspect-[16/9]"
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
                                <Image src={item.url} alt={post.title} fill className="object-cover" priority={index === 0} />
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
                          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Previous media"
                        >
                          <FiChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={function () { scrollToMedia(activeMediaIndex + 1); }}
                          disabled={activeMediaIndex === mediaTypes.length - 1}
                          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next media"
                        >
                          <FiChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/45 px-3 py-2 backdrop-blur">
                          {mediaTypes.map(function (item, index) {
                            return (
                              <button
                                key={item.url + '_dot_' + index}
                                type="button"
                                onClick={function () { scrollToMedia(index); }}
                                className={clsx(
                                  'h-2 rounded-full transition-all',
                                  index === activeMediaIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                                )}
                                aria-label={`Go to media ${index + 1}`}
                              />
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="px-5 py-6 md:px-8 md:py-8">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">
                          {categoryLabel}
                        </span>
                        {professionLabel ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {professionLabel}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                        {post.title}
                      </h1>

                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dce9f8] text-sm font-black text-primary">
                            {getInitials(post.authorName)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{post.authorName || 'Anonymous'}</p>
                            <p>{[formatDateValue(post.timestamp), postTimeLabel].filter(Boolean).join(' at ')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2 md:min-w-[250px]">
                      <button
                        onClick={handleLike}
                        className={clsx(
                          'inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border bg-white px-4 text-sm font-black transition-all',
                          hasLiked
                            ? 'border-rose-200 text-rose-500 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500'
                        )}
                      >
                        <HiHeart className={clsx('h-5 w-5 transition-transform', hasLiked && 'scale-110')} />
                        {post.likes || 0}
                      </button>
                      <div className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-600">
                        <HiChat className="h-5 w-5 text-primary" />
                        {commentCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 whitespace-pre-wrap text-[17px] leading-8 text-slate-700 md:text-lg">
                    {post.content}
                  </div>

                  {(requestInfoItems.length > 0 || post.isJobRequest) && (
                    <div className="mt-8 grid gap-3 md:grid-cols-3">
                      {requestInfoItems.map(function (item) {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="rounded-[20px] border border-slate-200 bg-[#f8fbff] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase text-slate-400">{item.label}</p>
                                <p className="mt-2 break-words text-base font-black leading-snug text-slate-900">{item.value}</p>
                              </div>
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="h-5 w-5" />
                              </div>
                            </div>
                            {item.action ? (
                              <a
                                href={item.action}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary hover:text-primary/80"
                              >
                                <FiExternalLink className="h-4 w-4" />
                                Open map
                              </a>
                            ) : null}
                          </div>
                        );
                      })}

                      {post.isJobRequest && (
                        <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 md:col-span-3">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs font-black uppercase text-slate-400">Offers</p>
                              <p className="mt-2 text-2xl font-black text-slate-950">{bidComments.length}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase text-slate-400">Lowest</p>
                              <p className="mt-2 text-2xl font-black text-primary">{bidStats.lowest !== null ? formatCurrencyValue(bidStats.lowest) : '--'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase text-slate-400">Highest</p>
                              <p className="mt-2 text-2xl font-black text-primary">{bidStats.highest !== null ? formatCurrencyValue(bidStats.highest) : '--'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-9 flex items-center justify-between border-t border-slate-200 pt-6">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Comments</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{commentCount} {commentCount === 1 ? 'reply' : 'replies'}</p>
                    </div>
                    <a href="#reply" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-primary">
                      Reply
                    </a>
                  </div>
                </div>
              </article>

              <section className="mx-auto mt-5 max-w-4xl space-y-3">
                {comments.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/80 px-5 py-8 text-center text-base font-semibold text-slate-500">
                    No comments yet.
                  </div>
                ) : (
                  comments.map(function (comment) {
                    const hasQuoteItems = Array.isArray(comment.quoteItems) && comment.quoteItems.length > 0;
                    const commentProfile = comment.authorUid ? commentProfiles[comment.authorUid] : null;

                    return (
                      <div key={comment.id} className={clsx(
                        'rounded-[22px] border bg-white px-5 py-5 shadow-sm',
                        comment.isBid ? 'border-primary/20 ring-1 ring-primary/10' : 'border-slate-200'
                      )}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dce9f8] text-sm font-black text-primary">
                                {getInitials(comment.authorName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-base font-black text-slate-950">{comment.authorName || 'Anonymous'}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-400">{timeAgo(comment.timestamp)}</p>
                              {commentProfile && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                  <FiStar className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  <span className="font-black text-slate-700">{Number(commentProfile.avgRating || 0).toFixed(1)}</span>
                                  <span>({commentProfile.reviewCount || 0})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {comment.isBid && comment.bidPrice !== null ? (
                            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-lg font-black text-primary">
                              <FiDollarSign className="h-4 w-4" />
                              {formatCurrencyValue(comment.bidPrice)}
                            </div>
                          ) : null}
                        </div>

                        {comment.text && (
                          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{comment.text}</p>
                        )}

                        {hasQuoteItems && (
                          <div className="mt-4 rounded-[18px] bg-[#f8fbff] p-4">
                            <p className="text-xs font-black uppercase text-slate-400">Quote items</p>
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
                              className="inline-flex items-center gap-2 text-base font-black text-primary hover:text-primary/80"
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

              <section id="reply" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_35px_rgba(15,23,42,0.12)] backdrop-blur">
                <form onSubmit={handleSubmitComment} className="mx-auto flex max-w-4xl flex-col gap-3 md:flex-row md:items-end">
                  {post.isJobRequest && (
                    <div className="flex h-12 items-center gap-3 rounded-[18px] border border-slate-200 bg-[#f8fbff] px-4 md:w-52">
                      <FiDollarSign className="h-5 w-5 text-primary" />
                      <input
                        value={bidPriceInput}
                        onChange={function (e) { setBidPriceInput(e.target.value.replace(/[^\d.]/g, '')); }}
                        inputMode="decimal"
                        placeholder="Bid Price"
                        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none"
                      />
                      <FiFileText className="h-5 w-5 flex-shrink-0 text-primary" />
                    </div>
                  )}

                  <div className="flex flex-1 items-end gap-3">
                    <textarea
                      value={commentText}
                      onChange={function (e) { setCommentText(e.target.value); }}
                      placeholder={user ? 'Add a comment or offer...' : 'Sign in to write a comment'}
                      rows={1}
                      disabled={!user || submitting}
                      className="min-h-[52px] flex-1 resize-none rounded-[18px] border border-slate-200 bg-[#f8fbff] px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="submit"
                      disabled={!user || submitting || !commentText.trim()}
                      className={clsx(
                        'inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white transition-all',
                        !user || submitting || !commentText.trim()
                          ? 'bg-slate-200'
                          : 'bg-primary shadow-lg shadow-primary/25 hover:scale-105'
                      )}
                      aria-label="Send comment"
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

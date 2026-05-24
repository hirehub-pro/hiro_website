import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  HiPlusCircle, HiChat, HiLightBulb, HiQuestionMarkCircle,
  HiViewGrid, HiHeart, HiDotsHorizontal,
  HiPencilAlt, HiX, HiPhotograph,
} from 'react-icons/hi';
import { FiCalendar, FiCheck, FiClock, FiFilter, FiMapPin, FiRefreshCw, FiSearch, FiUser } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getBlogPosts, createBlogPost, toggleBlogPostLike } from '../lib/firestore';
import { db, storage } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const FILTER_TYPES = ['all', 'recommended', 'request', 'tip', 'question', 'other'];

const CATEGORY_NORMALIZE = {
  recommended: 'recommended', recommendation: 'recommended',
  '\u05de\u05d5\u05de\u05dc\u05e5': 'recommended',
  '\u0645\u0648\u0635\u0649 \u0628\u0647': 'recommended',
  tip: 'tip', '\u05d8\u05d9\u05e4': 'tip',
  request: 'request', '\u05d1\u05e7\u05e9\u05d4': 'request',
  question: 'question', '\u05e9\u05d0\u05dc\u05d4': 'question',
  other: 'other', '\u05d0\u05d7\u05e8': 'other',
  '\u05d0\u05d7\u05e8\u05d9\u05dd': 'other',
  '\u0623\u062e\u0631': 'other',
  '\u0623\u062e\u0631\u0649': 'other',
  'job request': 'request', '\u05d3\u05e8\u05d5\u05e9 \u05d1\u05e2\u05dc \u05de\u05e7\u05e6\u05d5\u05e2': 'request',
};

const AVATAR_GRADIENTS = [
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-sky-400 to-blue-500',
  'from-lime-400 to-green-500',
];

function getAvatarGradient(str) {
  if (!str) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const FILTER_META = {
  all: {
    icon: HiViewGrid,
    color: 'from-primary to-sky-400',
    bg: 'bg-primary-50',
    text: 'text-primary',
    border: 'border-primary',
  },
  recommended: {
    icon: HiHeart,
    color: 'from-pink-400 to-rose-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-300',
  },
  request: {
    icon: HiPlusCircle,
    color: 'from-rose-400 to-pink-500',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-300',
  },
  tip: {
    icon: HiLightBulb,
    color: 'from-amber-400 to-yellow-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-300',
  },
  question: {
    icon: HiQuestionMarkCircle,
    color: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-300',
  },
  other: {
    icon: HiDotsHorizontal,
    color: 'from-slate-400 to-slate-600',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
  },
};

function getNormalizedCategory(category) {
  return CATEGORY_NORMALIZE[category] || category || 'other';
}

function getMediaKindFromFile(file) {
  if (!file) return null;
  if (String(file.type || '').startsWith('video/')) return 'video';
  if (String(file.type || '').startsWith('image/')) return 'image';
  return null;
}

function getMediaKindFromItem(item) {
  if (!item) return 'image';
  if (item.type === 'video') return 'video';
  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';
  return 'image';
}

function getProfessionLabel(item, locale) {
  return item?.[locale] || item?.en || item?.he || item?.ar || item?.logo || '';
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const nextDate = value.toDate();
    return Number.isNaN(nextDate.getTime()) ? null : nextDate;
  }
  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export default function CommunityPage() {
  const { t, dir, locale } = useLanguage();
  const { user, profile: myProfile } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [professionOptions, setProfessionOptions] = useState([]);
  const [professionsLoading, setProfessionsLoading] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('tip');
  const [newProfession, setNewProfession] = useState('');
  const [newRequestDateFrom, setNewRequestDateFrom] = useState('');
  const [newRequestDateTo, setNewRequestDateTo] = useState('');
  const [newRequestHourFrom, setNewRequestHourFrom] = useState('');
  const [newRequestHourTo, setNewRequestHourTo] = useState('');
  const [requestLocationLabel, setRequestLocationLabel] = useState('');
  const [requestLocationLat, setRequestLocationLat] = useState(null);
  const [requestLocationLng, setRequestLocationLng] = useState(null);
  const [requestLocationLoading, setRequestLocationLoading] = useState(false);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);

  const filterLabels = {
    all: t.community.all,
    recommended: t.community.recommended,
    request: t.community.request,
    tip: t.community.tip,
    question: t.community.question,
    other: t.community.other,
  };

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await getBlogPosts();
      setPosts(data);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(function () {
    loadPosts();
  }, []);

  useEffect(function () {
    let isMounted = true;

    async function loadProfessions() {
      setProfessionsLoading(true);
      try {
        const snap = await getDoc(doc(db, 'metadata', 'professions'));
        if (!isMounted) return;
        const items = (snap.data()?.items || [])
          .map(function (item, index) {
            return {
              id: String(item.id ?? index),
              label: getProfessionLabel(item, locale),
              value: item.en || item.logo || getProfessionLabel(item, locale),
            };
          })
          .filter(function (item) { return item.label && item.value; })
          .sort(function (a, b) { return Number(a.id) - Number(b.id); });
        setProfessionOptions(items);
      } catch (err) {
        if (isMounted) {
          setProfessionOptions([]);
          toast.error('Failed to load professions');
        }
      } finally {
        if (isMounted) setProfessionsLoading(false);
      }
    }

    loadProfessions();
    return function () {
      isMounted = false;
    };
  }, [locale]);

  useEffect(function () {
    if (!showPublish || newCategory !== 'request') return;

    const fallbackLabel = myProfile?.town || myProfile?.city || t.community.requestLocationFallback;
    const fallbackLat = typeof myProfile?.activeSearchLat === 'number' ? myProfile.activeSearchLat : myProfile?.lat;
    const fallbackLng = typeof myProfile?.activeSearchLng === 'number' ? myProfile.activeSearchLng : myProfile?.lng;

    setRequestLocationLabel(fallbackLabel);
    setRequestLocationLat(typeof fallbackLat === 'number' ? fallbackLat : null);
    setRequestLocationLng(typeof fallbackLng === 'number' ? fallbackLng : null);

    if (typeof window === 'undefined' || !navigator.geolocation) return;

    setRequestLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      function (position) {
        setRequestLocationLat(position.coords.latitude);
        setRequestLocationLng(position.coords.longitude);
        setRequestLocationLabel(myProfile?.town || myProfile?.city || t.community.requestLocationCurrent);
        setRequestLocationLoading(false);
      },
      function () {
        setRequestLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  }, [showPublish, newCategory, myProfile?.activeSearchLat, myProfile?.activeSearchLng, myProfile?.lat, myProfile?.lng, myProfile?.town, myProfile?.city, t.community.requestLocationCurrent, t.community.requestLocationFallback]);

  function formatShortDate(value) {
    const date = normalizeDateValue(value);
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  function formatPostDate(value) {
    const date = normalizeDateValue(value);
    if (!date) return '';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatHourRange(from, to) {
    if (from && to) return `${from} - ${to}`;
    return from || to || '';
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function formatDistance(post) {
    const preferredLat =
      typeof myProfile?.activeSearchLat === 'number' ? myProfile.activeSearchLat : myProfile?.lat;
    const preferredLng =
      typeof myProfile?.activeSearchLng === 'number' ? myProfile.activeSearchLng : myProfile?.lng;

    if (
      typeof post.locationLat !== 'number' ||
      typeof post.locationLng !== 'number' ||
      typeof preferredLat !== 'number' ||
      typeof preferredLng !== 'number'
    ) {
      return '';
    }

    const km = haversineKm(preferredLat, preferredLng, post.locationLat, post.locationLng);
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  }

  const filteredPosts = posts.filter(function (p) {
    const normalizedCategory = getNormalizedCategory(p.category);
    const isCoreCategory = ['recommended', 'request', 'tip', 'question'].includes(normalizedCategory);
    const categoryMatch =
      filter === 'all' ||
      (filter === 'other' ? !isCoreCategory || normalizedCategory === 'other' : normalizedCategory === filter);
    const haystack = [p.title, p.content, p.location, p.authorName, p.professionLabel, p.profession]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const searchMatch = !searchTerm.trim() || haystack.includes(searchTerm.trim().toLowerCase());
    return categoryMatch && searchMatch;
  }).sort(function (a, b) {
    const aTime = normalizeDateValue(a.timestamp);
    const bTime = normalizeDateValue(b.timestamp);
    return (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0);
  });

  function openPost(postId) {
    if (!postId) return;
    router.push('/community/' + postId);
  }

  async function handleLike(post) {
    if (!user) {
      toast.error('Sign in to like posts');
      return;
    }
    const likedByArr = Array.isArray(post.likedBy) ? post.likedBy : [];
    const hasLiked = likedByArr.includes(user.uid);
    setPosts(function (prev) {
      return prev.map(function (p) {
        if (p.id !== post.id) return p;
        const pLikedByArr = Array.isArray(p.likedBy) ? p.likedBy : [];
        return {
          ...p,
          likedBy: hasLiked ? pLikedByArr.filter(function (id) { return id !== user.uid; }) : [...pLikedByArr, user.uid],
          likes: (p.likes || 0) + (hasLiked ? -1 : 1),
        };
      });
    });
    try {
      await toggleBlogPostLike(post.id, user.uid, hasLiked);
    } catch (err) {
      loadPosts();
    }
  }

  useEffect(function () {
    return function () {
      mediaPreviews.forEach(function (item) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [mediaPreviews]);

  function handleImageChange(e) {
    const files = Array.from((e.target.files && e.target.files) || []);
    if (files.length === 0) return;

    if (newMediaFiles.length + files.length > 5) {
      toast.error('You can upload up to 5 images or videos.');
      e.target.value = '';
      return;
    }

    const invalidFile = files.find(function (file) {
      return !getMediaKindFromFile(file);
    });

    if (invalidFile) {
      toast.error('Only image and video files are allowed.');
      e.target.value = '';
      return;
    }

    setNewMediaFiles(function (prev) {
      return [...prev, ...files];
    });
    setMediaPreviews(function (prev) {
      return [
        ...prev,
        ...files.map(function (file, index) {
          return {
            id: file.name + '_' + file.size + '_' + (prev.length + index),
            kind: getMediaKindFromFile(file),
            previewUrl: URL.createObjectURL(file),
          };
        }),
      ];
    });
    e.target.value = '';
  }

  function removeMediaAtIndex(indexToRemove) {
    setNewMediaFiles(function (prev) {
      return prev.filter(function (_file, index) { return index !== indexToRemove; });
    });
    setMediaPreviews(function (prev) {
      const next = prev.filter(function (item, index) {
        if (index === indexToRemove && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return index !== indexToRemove;
      });
      return next;
    });
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }
    if (newCategory === 'request' && !newProfession) {
      toast.error(t.community.requestProfessionRequired);
      return;
    }
    setPublishing(true);
    try {
      let mediaTypes = [];
      if (newMediaFiles.length > 0) {
        mediaTypes = await Promise.all(newMediaFiles.map(async function (file, index) {
          const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
          const path = 'blog_media/' + user.uid + '_' + Date.now() + '_' + index + (extension ? '.' + extension : '');
          const snap = await uploadBytes(storageRef(storage, path), file);
          const url = await getDownloadURL(snap.ref);
          return {
            url,
            type: getMediaKindFromFile(file) || 'image',
          };
        }));
      }
      const imageUrls = mediaTypes
        .filter(function (item) { return item.type === 'image'; })
        .map(function (item) { return item.url; });
      const imageUrl = imageUrls[0] || '';
      const selectedProfession = professionOptions.find(function (item) {
        return item.value === newProfession;
      });
      await createBlogPost({
        authorUid: user.uid,
        authorName: (myProfile && myProfile.name) || user.displayName || 'Anonymous',
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        profession: newCategory === 'request' ? newProfession : '',
        professionLabel: newCategory === 'request' ? (selectedProfession?.label || newProfession) : '',
        imageUrl: imageUrl,
        imageUrls: imageUrls,
        mediaTypes: mediaTypes,
        location: newCategory === 'request' ? requestLocationLabel : '',
        locationLat: newCategory === 'request' ? requestLocationLat : null,
        locationLng: newCategory === 'request' ? requestLocationLng : null,
        requestDateFrom: newCategory === 'request' ? newRequestDateFrom : '',
        requestDateTo: newCategory === 'request' ? newRequestDateTo : '',
        requestHourFrom: newCategory === 'request' ? newRequestHourFrom : '',
        requestHourTo: newCategory === 'request' ? newRequestHourTo : '',
        isJobRequest: newCategory === 'request',
      });
      toast.success('Post published!');
      setNewTitle('');
      setNewContent('');
      setNewCategory('tip');
      setNewProfession('');
      setNewRequestDateFrom('');
      setNewRequestDateTo('');
      setNewRequestHourFrom('');
      setNewRequestHourTo('');
      setRequestLocationLabel('');
      setRequestLocationLat(null);
      setRequestLocationLng(null);
      setNewMediaFiles([]);
      mediaPreviews.forEach(function (item) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setMediaPreviews([]);
      setShowPublish(false);
      loadPosts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <Head><title>{'Hiro  ' + t.community.title}</title></Head>

      <div className="min-h-screen bg-[#edf4fb]" dir={dir}>
        <div className="mx-auto max-w-6xl px-4 pt-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Community & Jobs</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={loadPosts}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary hover:bg-white/70"
              >
                <FiRefreshCw className="h-5 w-5" />
              </button>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-primary hover:bg-white/70">
                <FiFilter className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#d7e4f3] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3 rounded-[22px] border border-[#d7e4f3] bg-[#f8fbff] px-4 py-3">
              <FiSearch className="h-5 w-5 text-slate-500" />
              <input
                value={searchTerm}
                onChange={function (e) { setSearchTerm(e.target.value); }}
                placeholder="Search posts..."
                className="w-full bg-transparent text-base text-slate-700 placeholder:text-slate-400 focus:outline-none md:text-lg"
              />
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-40 bg-[#edf4fb]/95 pt-4 backdrop-blur-xl" dir={dir}>
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
          {FILTER_TYPES.map(function (type) {
            const active = filter === type;
            return (
              <button
                key={type}
                onClick={function () { setFilter(type); }}
                className={clsx(
                  'shrink-0 flex items-center gap-2 rounded-[18px] border px-4 py-2.5 text-sm font-bold transition-all duration-200 md:px-5 md:text-base',
                  active
                    ? 'border-primary bg-[#dcebfb] text-primary shadow-sm'
                    : 'border-[#d7e4f3] bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {active ? <FiCheck className="h-4 w-4" /> : null}
                {filterLabels[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6" dir={dir}>

        {user && (
          <button
            onClick={function () { setShowPublish(true); }}
            className="mb-6 flex w-full items-center gap-3 rounded-[24px] border border-[#d7e4f3] bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className={'w-9 h-9 rounded-full bg-gradient-to-br ' + getAvatarGradient(user.uid) + ' flex items-center justify-center flex-shrink-0'}>
              <span className="text-white font-bold text-sm">
                {((myProfile && myProfile.name) || user.displayName || 'U')[0].toUpperCase()}
              </span>
            </div>
            <span className="flex-1 text-sm text-slate-400 md:text-base">Share a tip, question, or request...</span>
            <HiPencilAlt className="h-5 w-5 text-primary flex-shrink-0" />
          </button>
        )}

        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map(function (i) {
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-gray-200 rounded-lg w-1/3 mb-1.5" />
                      <div className="h-3 bg-gray-100 rounded-lg w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded-lg w-full mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gray-100">
              <HiChat className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">{t.community.noPosts}</h3>
            <p className="mt-2 max-w-xs text-sm text-gray-400">
              Be the first to share a tip, ask a question, or post a service request.
            </p>
            {user && (
              <button
                onClick={function () { setShowPublish(true); }}
                className="btn-primary mt-6 flex items-center gap-2 rounded-2xl px-6"
              >
                <HiPlusCircle className="h-5 w-5" />
                {t.community.publish}
              </button>
            )}
          </div>
        )}

        {!loading && filteredPosts.length > 0 && (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {filteredPosts.map(function (post) {
              const catKey = getNormalizedCategory(post.category);
              const nameParts = (post.authorName || 'U').split(' ');
              const initials = nameParts.map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
              const gradient = getAvatarGradient(post.authorUid || post.authorName || '');
              const likedByArr = Array.isArray(post.likedBy) ? post.likedBy : [];
              const hasLiked = user ? likedByArr.includes(user.uid) : false;
              const distanceLabel = formatDistance(post);
              const locationLabel = [distanceLabel, post.location].filter(Boolean).join(' • ');
              const professionLabel = post.professionLabel || post.profession || '';
              const dateLabel = formatPostDate(post.timestamp);
              const requestHourLabel = formatHourRange(post.requestHourFrom, post.requestHourTo);
              const mediaTypes = Array.isArray(post.mediaTypes) && post.mediaTypes.length > 0
                ? post.mediaTypes
                : (post.imageUrl ? [{ url: post.imageUrl, type: 'image' }] : []);
              const primaryMedia = mediaTypes[0] || null;

              return (
                <article
                  key={post.id}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-[28px] border border-[#d7e4f3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#b8d5f4] hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)]"
                  onClick={function () { openPost(post.id); }}
                >
                  {primaryMedia && (
                    <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#e5eef8] bg-[#f3f8fd]">
                      {getMediaKindFromItem(primaryMedia) === 'video' ? (
                        <video
                          src={primaryMedia.url}
                          controls
                          playsInline
                          preload="metadata"
                          onClick={function (e) { e.stopPropagation(); }}
                          className="h-full w-full bg-black object-cover"
                        />
                      ) : (
                        <Image
                          src={primaryMedia.url}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}
                      {mediaTypes.length > 1 ? (
                        <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white">
                          +{mediaTypes.length - 1}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#dcebfb] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-primary">
                            {catKey === 'request' ? 'Job Request' : (filterLabels[catKey] || t.community.other)}
                          </span>
                          {professionLabel ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {professionLabel}
                            </span>
                          ) : null}
                        </div>
                        {dateLabel ? (
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {dateLabel}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={function (e) { e.stopPropagation(); }}
                        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-slate-50"
                      >
                        <HiDotsHorizontal className="h-5 w-5" />
                      </button>
                    </div>

                    <h3 className="mt-4 text-xl font-black leading-tight tracking-tight text-slate-950 md:text-2xl">
                      {post.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 md:text-[15px]">
                      {post.content}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-slate-600">
                      {post.isJobRequest && (post.requestDateFrom || post.requestDateTo) ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#f3f7fc] px-3 py-2">
                          <FiCalendar className="h-4 w-4 text-slate-400" />
                          {formatShortDate(post.requestDateFrom)}{post.requestDateTo ? ` - ${formatShortDate(post.requestDateTo)}` : ''}
                        </span>
                      ) : null}
                      {locationLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5fc] px-3 py-2 text-primary">
                          <FiMapPin className="h-4 w-4" />
                          {locationLabel}
                        </span>
                      ) : null}
                      {post.isJobRequest && requestHourLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#f3f7fc] px-3 py-2">
                          <FiClock className="h-4 w-4 text-slate-400" />
                          {requestHourLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t border-[#edf3fa] pt-4">
                      <div className={'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ' + gradient}>
                        <span className="text-sm font-bold text-white">{initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-800">
                          {post.authorName || 'Anonymous'}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <FiUser className="h-3.5 w-3.5" />
                          Community member
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={function (e) { e.stopPropagation(); handleLike(post); }}
                          className={clsx(
                            'inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-all',
                            hasLiked
                              ? 'border-rose-200 bg-rose-50 text-rose-500'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-400'
                          )}
                        >
                          <HiHeart className={clsx('h-5 w-5 transition-transform', hasLiked && 'scale-110')} />
                          {post.likes || 0}
                        </button>
                        <button
                          onClick={function (e) { e.stopPropagation(); openPost(post.id); }}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-bold text-slate-500 transition-colors hover:border-primary hover:text-primary"
                        >
                          <HiChat className="h-4.5 w-4.5" />
                          {post.commentsCount || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="h-24 md:h-8" />
      </div>

      </div>

      {showPublish && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={function () { setShowPublish(false); }}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5 shadow-2xl sm:max-w-lg sm:rounded-[28px] sm:p-6"
            onClick={function (e) { e.stopPropagation(); }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-lg text-gray-900">New Post</h2>
              <button onClick={function () { setShowPublish(false); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <HiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="flex gap-2">
                {['recommended', 'tip', 'request', 'question', 'other'].map(function (cat) {
                  const m = FILTER_META[cat];
                  const I = m.icon;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={function () { setNewCategory(cat); }}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-all',
                        newCategory === cat ? m.bg + ' ' + m.border + ' ' + m.text : 'bg-gray-50 border-gray-100 text-gray-500'
                      )}
                    >
                      <I className="h-4 w-4" />
                      {filterLabels[cat]}
                    </button>
                  );
                })}
              </div>

              <input
                value={newTitle}
                onChange={function (e) { setNewTitle(e.target.value); }}
                placeholder="Title"
                maxLength={120}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />

              <textarea
                value={newContent}
                onChange={function (e) { setNewContent(e.target.value); }}
                placeholder="Share your tip, question, or request..."
                rows={4}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors resize-none"
              />

              {newCategory === 'request' ? (
                <div className="space-y-4 rounded-2xl border border-[#d7e4f3] bg-[#f8fbff] p-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestProfessionLabel}</label>
                    <select
                      value={newProfession}
                      onChange={function (e) { setNewProfession(e.target.value); }}
                      className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">
                        {professionsLoading ? t.community.requestProfessionLoading : t.community.requestProfessionPlaceholder}
                      </option>
                      {professionOptions.map(function (item) {
                        return (
                          <option key={item.id} value={item.value}>
                            {item.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestDateFromLabel}</label>
                      <input
                        type="date"
                        value={newRequestDateFrom}
                        onChange={function (e) { setNewRequestDateFrom(e.target.value); }}
                        className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestDateToLabel}</label>
                      <input
                        type="date"
                        value={newRequestDateTo}
                        onChange={function (e) { setNewRequestDateTo(e.target.value); }}
                        className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{t.community.requestDateHint}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestHourFromLabel}</label>
                      <input
                        type="time"
                        value={newRequestHourFrom}
                        onChange={function (e) { setNewRequestHourFrom(e.target.value); }}
                        className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestHourToLabel}</label>
                      <input
                        type="time"
                        value={newRequestHourTo}
                        onChange={function (e) { setNewRequestHourTo(e.target.value); }}
                        className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{t.community.requestHourHint}</p>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">{t.community.requestLocationLabel}</label>
                    <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-slate-700">
                      <FiMapPin className="h-4 w-4 text-primary" />
                      <span className="flex-1">
                        {requestLocationLoading ? t.community.requestLocationLoading : (requestLocationLabel || t.community.requestLocationFallback)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {mediaPreviews.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mediaPreviews.map(function (item, index) {
                    return (
                      <div key={item.id} className="relative h-32 overflow-hidden rounded-2xl bg-slate-100">
                        {item.kind === 'video' ? (
                          <video src={item.previewUrl} controls playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
                        ) : (
                          <Image src={item.previewUrl} alt={'preview ' + (index + 1)} fill className="object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={function () { removeMediaAtIndex(index); }}
                          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                        >
                          <HiX className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {newMediaFiles.length < 5 ? (
                <button
                  type="button"
                  onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-primary/30 hover:text-primary/60 transition-colors"
                >
                  <HiPhotograph className="h-5 w-5" />
                  Add up to 5 images or videos
                </button>
              ) : (
                <p className="text-center text-sm font-semibold text-slate-400">
                  Maximum 5 images or videos selected.
                </p>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleImageChange} />

              <div className="sticky bottom-0 -mx-5 mt-2 bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
                <button
                  type="submit"
                  disabled={publishing}
                  className="w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                >
                  {publishing ? 'Publishing...' : t.community.publish}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

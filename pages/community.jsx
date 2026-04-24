import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  HiPlusCircle, HiChat, HiLightBulb, HiQuestionMarkCircle,
  HiSparkles, HiHashtag, HiViewGrid, HiArrowRight,
  HiHeart, HiShare, HiDotsHorizontal,
  HiBadgeCheck, HiPencilAlt, HiX, HiPhotograph,
  HiLocationMarker,
} from 'react-icons/hi';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getBlogPosts, createBlogPost, toggleBlogPostLike } from '../lib/firestore';
import { storage } from '../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const FILTER_TYPES = ['all', 'request', 'tip', 'question'];

const CATEGORY_NORMALIZE = {
  tip: 'tip', '\u05d8\u05d9\u05e4': 'tip',
  request: 'request', '\u05d1\u05e7\u05e9\u05d4': 'request',
  question: 'question', '\u05e9\u05d0\u05dc\u05d4': 'question',
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

const FILTER_META = {
  all: {
    icon: HiViewGrid,
    color: 'from-primary to-sky-400',
    bg: 'bg-primary-50',
    text: 'text-primary',
    border: 'border-primary',
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
};

export default function CommunityPage() {
  const { t, dir } = useLanguage();
  const { user, profile: myProfile } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('tip');
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);

  const filterLabels = {
    all: t.community.all,
    request: t.community.request,
    tip: t.community.tip,
    question: t.community.question,
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

  const filteredPosts = posts.filter(function (p) {
    if (filter === 'all') return true;
    return (CATEGORY_NORMALIZE[p.category] || p.category) === filter;
  });

  const pinnedPost = posts.find(function (p) { return p.isPinned; });

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

  function handleImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setNewImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }
    setPublishing(true);
    try {
      let imageUrl = '';
      let imageUrls = [];
      if (newImage) {
        const path = 'blog_images/' + user.uid + '_' + Date.now() + '_' + newImage.name;
        const snap = await uploadBytes(storageRef(storage, path), newImage);
        imageUrl = await getDownloadURL(snap.ref);
        imageUrls = [imageUrl];
      }
      await createBlogPost({
        authorUid: user.uid,
        authorName: (myProfile && myProfile.name) || user.displayName || 'Anonymous',
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        imageUrl: imageUrl,
        imageUrls: imageUrls,
      });
      toast.success('Post published!');
      setNewTitle('');
      setNewContent('');
      setNewCategory('tip');
      setNewImage(null);
      setImagePreview(null);
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
      <Head><title>{'HireHub \u2013 ' + t.community.title}</title></Head>

      <div className="relative overflow-hidden bg-hero-gradient" dir={dir}>
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto max-w-2xl px-4 py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm mb-4">
            <HiSparkles className="h-3.5 w-3.5" />
            Community Hub
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{t.community.title}</h1>
          <p className="mt-3 text-sm leading-7 text-white/75 max-w-md">
            Share tips, ask questions, and post service requests with the HireHub community.
          </p>
          <div className="mt-6 flex items-center gap-5 text-white/80 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <HiHashtag className="h-4 w-4" />
              {FILTER_TYPES.length - 1} categories
            </span>
            <span className="flex items-center gap-1.5">
              <HiChat className="h-4 w-4" />
              {loading ? '...' : posts.length} posts
            </span>
          </div>
        </div>
      </div>

      <div className="sticky top-0 md:top-16 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl" dir={dir}>
        <div className="mx-auto max-w-2xl flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
          {FILTER_TYPES.map(function (type) {
            const meta = FILTER_META[type];
            const Icon = meta.icon;
            const active = filter === type;
            return (
              <button
                key={type}
                onClick={function () { setFilter(type); }}
                className={clsx(
                  'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold border transition-all duration-200',
                  active
                    ? meta.bg + ' ' + meta.border + ' ' + meta.text + ' shadow-sm scale-[1.03]'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {filterLabels[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5" dir={dir}>

        {pinnedPost ? (
          <div
            className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-r from-primary to-sky-400 p-5 shadow-glow-sm cursor-pointer"
            onClick={function () { openPost(pinnedPost.id); }}
          >
            <div className="absolute right-4 top-4 opacity-20"><HiSparkles className="h-16 w-16 text-white" /></div>
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <span className="text-xl">&#128204;</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{pinnedPost.title}</p>
                  <p className="mt-0.5 text-xs text-white/70 line-clamp-1">{pinnedPost.content}</p>
                </div>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                <HiArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-r from-primary to-sky-400 p-5 shadow-glow-sm">
            <div className="absolute right-4 top-4 opacity-20"><HiSparkles className="h-16 w-16 text-white" /></div>
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <span className="text-xl">&#128204;</span>
              </div>
              <div>
                <p className="font-bold text-white text-sm">{t.community.pinned}</p>
                <p className="mt-0.5 text-xs text-white/70">Welcome to the HireHub community</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          {FILTER_TYPES.filter(function (type) { return type !== 'all'; }).map(function (type) {
            const meta = FILTER_META[type];
            const Icon = meta.icon;
            const count = posts.filter(function (p) {
              return (CATEGORY_NORMALIZE[p.category] || p.category) === type;
            }).length;
            return (
              <button
                key={type}
                onClick={function () { setFilter(type); }}
                className={clsx(
                  'card-lift group flex flex-col items-center gap-2 rounded-[20px] border py-4',
                  filter === type ? meta.bg + ' ' + meta.border : 'border-gray-100 bg-white hover:border-gray-200'
                )}
              >
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br', meta.color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className={clsx('text-xs font-bold', filter === type ? meta.text : 'text-gray-600')}>
                  {filterLabels[type]}
                </span>
                {!loading && (
                  <span className="text-[11px] text-gray-400 font-medium -mt-1">{count} posts</span>
                )}
              </button>
            );
          })}
        </div>

        {user && (
          <button
            onClick={function () { setShowPublish(true); }}
            className="w-full mb-5 flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left"
          >
            <div className={'w-9 h-9 rounded-full bg-gradient-to-br ' + getAvatarGradient(user.uid) + ' flex items-center justify-center flex-shrink-0'}>
              <span className="text-white font-bold text-sm">
                {((myProfile && myProfile.name) || user.displayName || 'U')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-400 flex-1">Share a tip, question, or request...</span>
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

        {!loading && filteredPosts.map(function (post) {
          const catKey = CATEGORY_NORMALIZE[post.category] || 'tip';
          const meta = FILTER_META[catKey] || FILTER_META.tip;
          const Icon = meta.icon;
          const nameParts = (post.authorName || 'U').split(' ');
          const initials = nameParts.map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
          const gradient = getAvatarGradient(post.authorUid || post.authorName || '');
          const likedByArr = Array.isArray(post.likedBy) ? post.likedBy : [];
          const hasLiked = user ? likedByArr.includes(user.uid) : false;

          return (
            <div
              key={post.id}
              className="mb-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
              onClick={function () { openPost(post.id); }}
            >
              {post.imageUrl && (
                <div className="relative w-full h-48">
                  <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={'w-10 h-10 rounded-full bg-gradient-to-br ' + gradient + ' flex items-center justify-center flex-shrink-0'}>
                      <span className="text-white font-bold text-sm">{initials}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-gray-900">{post.authorName || 'Anonymous'}</span>
                        {post.isVerified && <HiBadgeCheck className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{timeAgo(post.timestamp)}</span>
                        {post.location && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <HiLocationMarker className="w-3 h-3" />
                            {post.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={clsx('flex items-center gap-1 shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border', meta.bg, meta.text, meta.border)}>
                    <Icon className="h-3.5 w-3.5" />
                    {filterLabels[catKey]}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{post.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{post.content}</p>

                <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-gray-50">
                  <button
                    onClick={function (e) { e.stopPropagation(); handleLike(post); }}
                    className={clsx(
                      'flex items-center gap-1.5 text-sm font-semibold transition-colors',
                      hasLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'
                    )}
                  >
                    <HiHeart className={clsx('h-5 w-5 transition-transform', hasLiked && 'scale-110')} />
                    {post.likes || 0}
                  </button>
                  <button
                    onClick={function (e) { e.stopPropagation(); openPost(post.id); }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-primary transition-colors"
                  >
                    <HiChat className="h-5 w-5" />
                    {post.commentsCount || 0}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={function (e) { e.stopPropagation(); }}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <HiShare className="h-5 w-5" />
                  </button>
                  <button
                    onClick={function (e) { e.stopPropagation(); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiDotsHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="h-24 md:h-8" />
      </div>

      {user && !showPublish && (
        <button
          onClick={function () { setShowPublish(true); }}
          className="fixed bottom-20 ltr:right-4 rtl:left-4 md:bottom-8 md:ltr:right-8 md:rtl:left-8 z-40 flex items-center gap-2 rounded-2xl bg-hero-gradient px-5 py-3.5 font-bold text-sm text-white shadow-glow transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <HiPlusCircle className="h-5 w-5" />
          {t.community.publish}
        </button>
      )}

      {showPublish && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={function () { setShowPublish(false); }}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
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
                {['tip', 'request', 'question'].map(function (cat) {
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

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden h-40">
                  <Image src={imagePreview} alt="preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={function () { setNewImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <HiX className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-primary/30 hover:text-primary/60 transition-colors"
                >
                  <HiPhotograph className="h-5 w-5" />
                  Add photo (optional)
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

              <button
                type="submit"
                disabled={publishing}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 shadow-glow"
              >
                {publishing ? 'Publishing...' : t.community.publish}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { HiArrowLeft, HiChat, HiHeart, HiLocationMarker } from 'react-icons/hi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBlogPost,
  getBlogComments,
  createBlogComment,
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

export default function BlogPostPage() {
  const router = useRouter();
  const { postId } = router.query;
  const { dir } = useLanguage();
  const { user, profile } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(function () {
    if (!postId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [postData, commentData] = await Promise.all([
          getBlogPost(postId),
          getBlogComments(postId),
        ]);
        setPost(postData);
        setComments(commentData);
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
      const payload = {
        postId: post.id,
        authorUid: user.uid,
        authorName: (profile && profile.name) || user.displayName || 'Anonymous',
        text: commentText.trim(),
      };

      await createBlogComment(payload);

      const nextComment = {
        id: 'local_' + Date.now(),
        ...payload,
        timestamp: new Date(),
      };

      setComments(function (prev) { return [...prev, nextComment]; });
      setPost(function (prev) {
        if (!prev) return prev;
        return { ...prev, commentsCount: (prev.commentsCount || 0) + 1 };
      });
      setCommentText('');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head><title>{post ? post.title + ' - Hiro' : 'Post - Hiro'}</title></Head>

      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8" dir={dir}>
        <div className="mb-4">
          <Link href="/community" className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <HiArrowLeft className="h-4 w-4" />
            Back to community
          </Link>
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
            <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {post.imageUrl && (
                <div className="relative h-64 w-full md:h-80">
                  <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                </div>
              )}

              <div className="p-5 md:p-6">
                <div className="mb-2 inline-flex items-center rounded-full border border-primary/20 bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
                  {CATEGORY_LABELS[post.category] || 'Post'}
                </div>

                <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">{post.title}</h1>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{post.authorName || 'Anonymous'}</span>
                  <span>•</span>
                  <span>{timeAgo(post.timestamp)}</span>
                  {post.location && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <HiLocationMarker className="h-3.5 w-3.5" />
                        {post.location}
                      </span>
                    </>
                  )}
                </div>

                <p className="mt-5 whitespace-pre-wrap leading-7 text-gray-700">{post.content}</p>

                <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-4">
                  <button
                    onClick={handleLike}
                    className={clsx(
                      'inline-flex items-center gap-1.5 text-sm font-semibold transition-colors',
                      hasLiked ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                    )}
                  >
                    <HiHeart className={clsx('h-5 w-5', hasLiked && 'scale-110')} />
                    {post.likes || 0}
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500">
                    <HiChat className="h-5 w-5" />
                    {post.commentsCount || comments.length || 0}
                  </span>
                </div>
              </div>
            </article>

            <section className="mt-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-extrabold text-gray-900">Comments</h2>

              <form onSubmit={handleSubmitComment} className="mt-4 space-y-3">
                <textarea
                  value={commentText}
                  onChange={function (e) { setCommentText(e.target.value); }}
                  placeholder={user ? 'Write a comment...' : 'Sign in to write a comment'}
                  rows={3}
                  disabled={!user || submitting}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="submit"
                  disabled={!user || submitting || !commentText.trim()}
                  className="btn-primary"
                >
                  {submitting ? 'Posting...' : 'Post comment'}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {comments.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">No comments yet.</p>
                ) : (
                  comments.map(function (comment) {
                    return (
                      <div key={comment.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-gray-800">{comment.authorName || 'Anonymous'}</p>
                          <p className="text-xs text-gray-500">{timeAgo(comment.timestamp)}</p>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

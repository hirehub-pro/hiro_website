import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { HiArrowLeft, HiChat, HiHeart } from 'react-icons/hi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  getWorkerProject,
  getProjectComments,
  createProjectComment,
  getProjectLikes,
  toggleProjectLike,
} from '../../../../lib/firestore';

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

export default function ProjectDetailsPage() {
  const router = useRouter();
  const { uid, projectId } = router.query;
  const { user, profile } = useAuth();

  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [likedBy, setLikedBy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(function () {
    if (!uid || !projectId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [projectData, commentsData, likesData] = await Promise.all([
          getWorkerProject(uid, projectId),
          getProjectComments(uid, projectId),
          getProjectLikes(uid, projectId),
        ]);

        setProject(projectData);
        setComments(commentsData);
        setLikedBy(likesData);
      } catch (error) {
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [uid, projectId]);

  const hasLiked = useMemo(function () {
    if (!user) return false;
    return Array.isArray(likedBy) && likedBy.includes(user.uid);
  }, [likedBy, user]);

  async function handleToggleLike() {
    if (!user) {
      toast.error('Sign in to like project');
      return;
    }

    const nextLiked = hasLiked
      ? likedBy.filter(function (id) { return id !== user.uid; })
      : [...likedBy, user.uid];
    setLikedBy(nextLiked);

    try {
      await toggleProjectLike(uid, projectId, user.uid, hasLiked);
    } catch (error) {
      toast.error('Failed to update like');
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
        uid,
        projectId,
        userId: user.uid,
        userName: (profile && profile.name) || user.displayName || 'Anonymous',
        userImage: (profile && profile.profileImageUrl) || user.photoURL || '',
        text: commentText.trim(),
      };

      await createProjectComment(payload);

      setComments(function (prev) {
        return [
          ...prev,
          {
            id: 'local_' + Date.now(),
            ...payload,
            timestamp: new Date(),
          },
        ];
      });

      setProject(function (prev) {
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
      <Head><title>{project ? 'Project - Hiro' : 'Project - Hiro'}</title></Head>

      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="mb-4">
          <Link href={'/profile/' + uid} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <HiArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ) : !project ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">Project not found.</p>
          </div>
        ) : (
          <>
            <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="relative h-64 w-full md:h-96">
                <Image
                  src={project.imageUrl || '/placeholder-project.jpg'}
                  alt={project.description || 'Project image'}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-5 md:p-6">
                <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">Project Photo</h1>

                {project.description && (
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-700">{project.description}</p>
                )}

                <div className="mt-5 flex items-center gap-4 border-t border-gray-100 pt-4">
                  <button
                    onClick={handleToggleLike}
                    className={clsx(
                      'inline-flex items-center gap-1.5 text-sm font-semibold transition-colors',
                      hasLiked ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'
                    )}
                  >
                    <HiHeart className={clsx('h-5 w-5', hasLiked && 'scale-110')} />
                    {likedBy.length}
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500">
                    <HiChat className="h-5 w-5" />
                    {project.commentsCount || comments.length || 0}
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
                          <p className="text-sm font-bold text-gray-800">{comment.userName || 'Anonymous'}</p>
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

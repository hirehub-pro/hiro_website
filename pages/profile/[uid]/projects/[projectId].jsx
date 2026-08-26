import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { HiArrowLeft, HiChat, HiHeart } from 'react-icons/hi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { getProjectPageSeo } from '../../../../lib/page-seo';
import { absoluteUrl } from '../../../../lib/seo-locale';
import {
  getWorkerProject,
  getProjectComments,
  createProjectComment,
  getProjectLikes,
  toggleProjectLike,
} from '../../../../lib/firestore';

const DEFAULT_VIDEO_THUMBNAIL = 'https://hiro-services.com/web-app-manifest-512x512.png';

function normalizeDateValue(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(timestamp) {
  const date = normalizeDateValue(timestamp);
  return date ? date.toISOString() : '';
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = normalizeDateValue(timestamp);
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString();
}

function getMediaKind(item) {
  if (!item) return 'image';

  const rawType = String(item.type || item.kind || item.contentType || '').trim().toLowerCase();
  if (rawType === 'video' || rawType.startsWith('video/')) return 'video';

  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';

  if (rawType === 'image' || rawType.startsWith('image/')) return 'image';

  return 'image';
}

function getVideoMimeType(url) {
  const normalizedUrl = String(url || '').toLowerCase();
  if (normalizedUrl.includes('.webm')) return 'video/webm';
  if (normalizedUrl.includes('.mov')) return 'video/quicktime';
  if (normalizedUrl.includes('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
}

function getProjectMedia(project) {
  if (Array.isArray(project?.media) && project.media.length > 0) {
    return project.media
      .filter(function (item) { return item && item.url; })
      .map(function (item) {
        return {
          ...item,
          type: getMediaKind(item),
        };
      });
  }

  if (Array.isArray(project?.imageUrls) && project.imageUrls.length > 0) {
    return project.imageUrls
      .filter(Boolean)
      .map(function (url, index) {
        return {
          url,
          type: project.mediaTypes?.[index] === 'video' ? 'video' : 'image',
        };
      });
  }

  if (project?.imageUrl) {
    return [{ type: getMediaKind({ url: project.imageUrl }), url: project.imageUrl }];
  }

  return [];
}

function serializeForPageProps(value) {
  if (!value) return value;
  return JSON.parse(JSON.stringify(value, function (_key, item) {
    if (item && typeof item.toDate === 'function') return item.toDate().toISOString();
    return item;
  }));
}

export default function ProjectDetailsPage({ initialProject = null }) {
  const router = useRouter();
  const { uid, projectId } = router.query;
  const { user, profile } = useAuth();

  const [project, setProject] = useState(initialProject);
  const [comments, setComments] = useState([]);
  const [likedBy, setLikedBy] = useState([]);
  const [loading, setLoading] = useState(!initialProject);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const seo = getProjectPageSeo(project, project?.userName || '');
  const canonicalUrl = uid && projectId
    ? absoluteUrl(`/profile/${uid}/projects/${projectId}`)
    : absoluteUrl('/search');
  const media = useMemo(function () {
    return getProjectMedia(project);
  }, [project]);
  const ogImage = useMemo(function () {
    const firstImage = media.find(function (item) {
      return item.type === 'image' && item.url;
    });
    return firstImage?.url || '';
  }, [media]);
  const imageMedia = media.filter(function (item) { return item.type === 'image' && item.url; });
  const videoMedia = media.filter(function (item) { return item.type === 'video' && item.url; });
  const socialImageUrl = ogImage || (videoMedia.length > 0 ? DEFAULT_VIDEO_THUMBNAIL : '');
  const videoThumbnailUrl = socialImageUrl || DEFAULT_VIDEO_THUMBNAIL;
  const videoStructuredData = project && videoMedia.length > 0
    ? {
      '@context': 'https://schema.org',
      '@graph': videoMedia.map(function (video, index) {
        return {
          '@type': 'VideoObject',
          name: index === 0 ? seo.title : `${seo.title} ${index + 1}`,
          description: seo.description,
          thumbnailUrl: [video.thumbnailUrl || video.thumbnail || videoThumbnailUrl],
          uploadDate: toIsoDate(project.timestamp) || new Date().toISOString(),
          contentUrl: video.url,
          embedUrl: canonicalUrl,
        };
      }),
    }
    : null;

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
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {imageMedia.map((image, index) => (
          <meta key={`og-image-${image.url}-${index}`} property="og:image" content={image.url} />
        ))}
        {imageMedia.length === 0 && socialImageUrl ? <meta property="og:image" content={socialImageUrl} /> : null}
        {socialImageUrl ? <meta name="twitter:card" content="summary_large_image" /> : null}
        {socialImageUrl ? <meta name="twitter:image" content={socialImageUrl} /> : null}
        {videoMedia.map((video, index) => (
          <meta key={`og-video-${video.url}-${index}`} property="og:video" content={video.url} />
        ))}
        {videoMedia.map((video, index) => (
          <meta key={`og-video-secure-${video.url}-${index}`} property="og:video:secure_url" content={video.url} />
        ))}
        {videoMedia.map((video, index) => (
          <meta key={`og-video-type-${video.url}-${index}`} property="og:video:type" content={getVideoMimeType(video.url)} />
        ))}
        {videoStructuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(videoStructuredData) }}
          />
        ) : null}
        <link rel="canonical" href={canonicalUrl} />
      </Head>

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
              <div className={clsx(
                'grid grid-cols-1 gap-2 bg-gray-100 p-2'
              )}>
                {(media.length > 0 ? media : [{ type: 'image', url: '/placeholder-project.jpg' }]).map(function (item, index) {
                  const isVideo = getMediaKind(item) === 'video';
                  return (
                    <div
                      key={`${item.url}-${index}`}
                      className="relative h-[70vh] max-h-[760px] min-h-[320px] overflow-hidden rounded-2xl bg-gray-950"
                    >
                      {isVideo ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-contain"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={item.url || '/placeholder-project.jpg'}
                          alt={project.description || 'Project image'}
                          fill
                          sizes="(min-width: 768px) 768px, 100vw"
                          className="object-contain"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-5 md:p-6">
                <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">Project</h1>

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

export async function getServerSideProps({ params }) {
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const projectId = typeof params?.projectId === 'string' ? params.projectId : '';

  try {
    const initialProject = await getWorkerProject(uid, projectId);

    return {
      props: {
        initialProject: initialProject ? serializeForPageProps(initialProject) : null,
      },
    };
  } catch (error) {
    return {
      props: {
        initialProject: null,
      },
    };
  }
}

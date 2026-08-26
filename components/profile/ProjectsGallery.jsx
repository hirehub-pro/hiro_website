import Image from 'next/image';
import Link from 'next/link';
import { HiDuplicate, HiPhotograph, HiPlay } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';

function getMediaKind(item) {
  if (!item) return 'image';

  const rawType = String(item.type || item.kind || item.contentType || '').trim().toLowerCase();
  if (rawType === 'video' || rawType.startsWith('video/')) return 'video';

  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';

  if (rawType === 'image' || rawType.startsWith('image/')) return 'image';

  return 'image';
}

function getProjectMedia(project) {
  if (Array.isArray(project?.media) && project.media.length > 0) {
    return project.media
      .filter((item) => item?.url)
      .map((item) => ({
        ...item,
        type: getMediaKind(item),
      }));
  }

  if (Array.isArray(project?.imageUrls) && project.imageUrls.length > 0) {
    return project.imageUrls
      .filter(Boolean)
      .map((url, index) => ({
        url,
        type: project.mediaTypes?.[index] === 'video' ? 'video' : 'image',
      }));
  }

  if (project?.imageUrl) {
    return [{ type: getMediaKind({ url: project.imageUrl }), url: project.imageUrl }];
  }

  return [];
}

function getVideoPreviewUrl(url) {
  const rawUrl = String(url || '');
  if (!rawUrl || rawUrl.includes('#t=')) return rawUrl;
  return `${rawUrl}#t=0.1`;
}

function SkeletonTile() {
  return (
    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl animate-pulse" />
  );
}

export default function ProjectsGallery({ projects, loading, profileUid }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonTile key={i} />)}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <HiPhotograph className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700">{t.profile.noProjects}</p>
        <p className="text-sm text-gray-400 mt-1">No projects uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {projects.map((project) => {
        const media = getProjectMedia(project);
        const primaryMedia = media[0];
        const isVideo = getMediaKind(primaryMedia) === 'video';

        return (
          <Link key={project.id} href={'/profile/' + profileUid + '/projects/' + project.id} className="relative aspect-square overflow-hidden rounded-[28px] bg-slate-100 shadow-sm transition-shadow duration-300 hover:shadow-xl group cursor-pointer block">
            {isVideo ? (
              <>
                <video
                  src={getVideoPreviewUrl(primaryMedia.url)}
                  poster={primaryMedia.thumbnailUrl || primaryMedia.thumbnail || undefined}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-black/15 text-white shadow-lg backdrop-blur-[1px]">
                    <HiPlay className="ml-0.5 h-6 w-6" />
                  </span>
                </div>
              </>
            ) : (
              <Image
                src={primaryMedia?.url || '/placeholder-project.jpg'}
                alt={project.description || 'Project'}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              {project.description && (
                <p className="text-white text-xs line-clamp-2 font-medium">{project.description}</p>
              )}
            </div>
            {/* Shine effect */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
            {media.length > 1 && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm backdrop-blur-sm">
                <span>{media.length}</span>
                <HiDuplicate className="h-4 w-4" />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

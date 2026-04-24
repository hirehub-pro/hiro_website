import Image from 'next/image';
import Link from 'next/link';
import { HiPhotograph } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';

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
      {projects.map((project) => (
        <Link key={project.id} href={'/profile/' + profileUid + '/projects/' + project.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer block">
          <Image
            src={project.imageUrl || '/placeholder-project.jpg'}
            alt={project.description || 'Project'}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            {project.description && (
              <p className="text-white text-xs line-clamp-2 font-medium">{project.description}</p>
            )}
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
          <div className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Open
          </div>
        </Link>
      ))}
    </div>
  );
}

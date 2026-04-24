import Link from 'next/link';
import Image from 'next/image';
import { HiStar, HiBadgeCheck } from 'react-icons/hi';

export default function WorkerCard({ worker, compact = false }) {
  const avatarUrl =
    worker.profileImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name || 'U')}&background=1976D2&color=fff`;

  if (compact) {
    return (
      <Link
        href={`/profile/${worker.uid}`}
        className="card-lift group block overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-card"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="relative h-16 w-16">
            <Image
              src={avatarUrl}
              alt={worker.name || 'Worker'}
              fill
              className="rounded-2xl object-cover"
            />
            {worker.verified && (
              <HiBadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-primary" />
            )}
          </div>
          <div className="rounded-2xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
            <span className="flex items-center gap-1">
              <HiStar className="h-4 w-4" />
              {worker.avgRating?.toFixed(1) ?? '0.0'}
            </span>
          </div>
        </div>

        <p className="line-clamp-1 text-base font-extrabold text-gray-900">
          {worker.name}
        </p>

        <p className="mt-1 line-clamp-1 text-sm font-medium text-gray-500">
          {Array.isArray(worker.professions) ? worker.professions[0] : ''}
        </p>

        {(worker.town || worker.city) && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {worker.town || worker.city}
          </p>
        )}

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-hero-gradient" style={{ width: `${Math.min(((worker.avgRating || 0) / 5) * 100, 100)}%` }} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/profile/${worker.uid}`}
      className="card-lift flex items-center gap-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-card"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={avatarUrl}
          alt={worker.name || 'Worker'}
          fill
          className="object-cover"
        />
        {worker.verified && (
          <HiBadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-base font-extrabold text-gray-900">{worker.name}</p>
        <p className="truncate text-sm font-medium text-gray-500">
          {Array.isArray(worker.professions) ? worker.professions.join(' • ') : ''}
        </p>
        {(worker.town || worker.city) && (
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{worker.town || worker.city}</p>
        )}
      </div>

      <div className="shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-amber-600">
        <div className="flex items-center gap-1">
          <HiStar className="h-4 w-4" />
          <span className="text-sm font-bold">
            {worker.avgRating?.toFixed(1) ?? '0.0'}
          </span>
        </div>
      </div>
    </Link>
  );
}

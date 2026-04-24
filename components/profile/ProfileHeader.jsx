import Image from 'next/image';
import { HiBadgeCheck, HiStar, HiLocationMarker } from 'react-icons/hi';
import { FiPhone, FiMessageSquare, FiShare2, FiFlag } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

const badgeConfig = {
  id:       { labelKey: 'idVerified',       icon: '🪪', gradient: 'from-blue-500 to-indigo-600' },
  business: { labelKey: 'businessVerified', icon: '🏢', gradient: 'from-emerald-500 to-teal-600' },
  insured:  { labelKey: 'insured',          icon: '🛡️', gradient: 'from-violet-500 to-purple-600' },
};

function StatPill({ value, label }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm min-w-[72px]">
      <span className="text-lg font-extrabold text-gray-900 leading-none">{value}</span>
      <span className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</span>
    </div>
  );
}

export default function ProfileHeader({ profile }) {
  const { t } = useLanguage();

  const avatarUrl =
    profile.profileImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=1976D2&color=fff&size=200`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: profile.name, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="bg-white">
      {/* ── Hero banner ── */}
      <div className="relative h-48 md:h-60 overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-cyan-500">
        {/* Animated mesh blobs */}
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 animate-float" />
        <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-white/10 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-8 right-1/3 w-24 h-24 rounded-full bg-white/5" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Top action row */}
        <div className="absolute top-4 inset-x-0 flex items-center justify-between px-4">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 active:scale-95 transition-all"
            aria-label="Share"
          >
            <FiShare2 className="w-4 h-4" />
          </button>
          <button
            className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 active:scale-95 transition-all"
            aria-label="Report"
          >
            <FiFlag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Avatar + identity ── */}
      <div className="relative -mt-14 px-4 pb-2">
        <div className="flex flex-col items-center text-center">

          {/* Avatar ring */}
          <div className="relative mb-3 p-1 rounded-full bg-gradient-to-br from-indigo-500 via-primary to-cyan-400 shadow-glow">
            <div className="p-0.5 rounded-full bg-white">
              <div className="relative w-24 h-24 md:w-28 md:h-28">
                <Image
                  src={avatarUrl}
                  alt={profile.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            </div>
            {profile.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                <HiBadgeCheck className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>

          {/* Name + verified */}
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight flex items-center gap-1.5">
            {profile.name}
            {profile.verified && <HiBadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />}
          </h1>

          {/* Professions */}
          {Array.isArray(profile.professions) && profile.professions.length > 0 && (
            <p className="text-sm text-gray-500 mt-1 font-medium">
              {profile.professions.join(' · ')}
            </p>
          )}

          {/* Location */}
          {(profile.town || profile.city) && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
              <HiLocationMarker className="w-3.5 h-3.5" />
              <span>{profile.town || profile.city}</span>
            </div>
          )}

          {/* Avg rating */}
          {profile.avgRating > 0 && (
            <div className="flex items-center gap-1 mt-2.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
              {[1, 2, 3, 4, 5].map((s) => (
                <HiStar
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(profile.avgRating) ? 'text-amber-400' : 'text-gray-200'}`}
                />
              ))}
              <span className="text-sm font-bold text-amber-700 ml-1">{profile.avgRating.toFixed(1)}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-2.5 mt-4">
            <StatPill value={profile.profileViews ?? profile.viewCount ?? 0} label={t.profile.views} />
            <StatPill value={profile.reviewCount ?? 0} label={t.profile.reviews} />
            <StatPill value={profile.projectCount ?? 0} label={t.profile.projects} />
          </div>

          {/* Trust badges */}
          {Array.isArray(profile.badges) && profile.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {profile.badges.map((b) => {
                const cfg = badgeConfig[b];
                if (!cfg) return null;
                return (
                  <span
                    key={b}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold text-white bg-gradient-to-r ${cfg.gradient} shadow-sm`}
                  >
                    <span>{cfg.icon}</span>
                    {t.profile[cfg.labelKey]}
                  </span>
                );
              })}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 mt-5 w-full max-w-xs">
            <a
              href={profile.phone ? `tel:${profile.phone}` : '#'}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-glow"
            >
              <FiPhone className="w-4 h-4" />
              {t.profile.contact}
            </a>
            <button className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-primary/20 text-primary py-3 rounded-2xl font-bold text-sm hover:bg-primary/5 active:scale-95 transition-all shadow-sm">
              <FiMessageSquare className="w-4 h-4" />
              {t.profile.message}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

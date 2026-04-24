import { HiStar } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';

const AVATAR_GRADIENTS = [
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-sky-400 to-blue-500',
  'from-lime-400 to-green-500',
];

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <HiStar
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ReviewsList({ reviews, loading }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded-lg w-1/3 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded-lg w-1/4" />
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-lg w-full mb-1.5" />
            <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
          <HiStar className="w-8 h-8 text-amber-300" />
        </div>
        <p className="font-semibold text-gray-700">{t.profile.noReviews}</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to leave a review</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r, i) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-sm">
                  {(r.userName || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">{r.userName || 'Anonymous'}</p>
                <StarRow rating={r.rating} />
              </div>
            </div>
            <span className="text-xs text-gray-400 mt-0.5 flex-shrink-0">{timeAgo(r.timestamp)}</span>
          </div>
          {r.comment && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed border-t border-gray-50 pt-3">
              {r.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

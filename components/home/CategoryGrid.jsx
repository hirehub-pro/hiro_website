import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';

const categories = [
  { id: 'electrician',  labelEn: 'Electrician', labelHe: 'חשמלאי',    labelAr: 'كهربائي',    icon: '⚡', bg: 'bg-yellow-50',  iconBg: 'bg-yellow-100',  color: 'text-yellow-500' },
  { id: 'plumber',      labelEn: 'Plumber',     labelHe: 'אינסטלטור', labelAr: 'سباك',       icon: '🔧', bg: 'bg-blue-50',    iconBg: 'bg-blue-100',    color: 'text-blue-500'   },
  { id: 'painter',      labelEn: 'Painter',     labelHe: 'צבע',       labelAr: 'دهّان',      icon: '🎨', bg: 'bg-red-50',     iconBg: 'bg-red-100',     color: 'text-red-500'    },
  { id: 'carpenter',    labelEn: 'Carpenter',   labelHe: 'נגר',       labelAr: 'نجار',       icon: '🪚', bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   color: 'text-amber-700'  },
  { id: 'landscaper',   labelEn: 'Landscaper',  labelHe: 'גנן',       labelAr: 'مزارع',      icon: '🌳', bg: 'bg-green-50',   iconBg: 'bg-green-100',   color: 'text-green-600'  },
  { id: 'locksmith',    labelEn: 'Locksmith',   labelHe: 'מנעולן',    labelAr: 'قفّال',      icon: '🔑', bg: 'bg-gray-50',    iconBg: 'bg-gray-200',    color: 'text-gray-600'   },
  { id: 'cleaner',      labelEn: 'Cleaner',     labelHe: 'מנקה',      labelAr: 'عمّال نظافة', icon: '🧹', bg: 'bg-teal-50',    iconBg: 'bg-teal-100',    color: 'text-teal-600'   },
  { id: 'ac',           labelEn: 'AC Technician', labelHe: 'נורא"מ',  labelAr: 'تكييف',      icon: '❄️', bg: 'bg-sky-50',     iconBg: 'bg-sky-100',     color: 'text-sky-500'    },
];

export default function CategoryGrid({ showAll = false }) {
  const { t, locale } = useLanguage();
  const displayed = showAll ? categories : categories.slice(0, 8);

  function getLabel(cat) {
    if (locale === 'he') return cat.labelHe;
    if (locale === 'ar') return cat.labelAr;
    return cat.labelEn;
  }

  return (
    <section className="px-4 md:px-0 animate-fade-up delay-150">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.24em] text-primary/65">Browse faster</p>
          <h2 className="section-title">{t.home.popularCategories}</h2>
        </div>
        <Link href="/search" className="text-sm font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5">
          {t.home.seeAll}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-8">
        {displayed.map((cat) => (
          <Link
            key={cat.id}
            href={`/search?q=${encodeURIComponent(getLabel(cat))}`}
            className={`${cat.bg} card-lift group relative overflow-hidden rounded-[26px] border border-white/70 p-4 shadow-card cursor-pointer animate-fade-up`}
            style={{ animationDelay: `${categories.indexOf(cat) * 70}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/60 to-transparent opacity-80" />
            <div className={`${cat.iconBg} relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}>
              {cat.icon}
            </div>
            <span className="relative line-clamp-2 text-sm font-bold text-gray-800 leading-tight">
              {getLabel(cat)}
            </span>
            <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Explore</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

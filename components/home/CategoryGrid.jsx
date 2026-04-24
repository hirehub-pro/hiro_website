import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';

const fallbackCategories = [
  { id: 'Electrician', labelEn: 'Electrician', labelHe: 'חשמלאי', labelAr: 'كهربائي', icon: '⚡', bg: 'bg-yellow-50', iconBg: 'bg-yellow-100' },
  { id: 'Plumber', labelEn: 'Plumber', labelHe: 'אינסטלטור', labelAr: 'سباك', icon: '🔧', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
  { id: 'Painter', labelEn: 'Painter', labelHe: 'צבע', labelAr: 'دهّان', icon: '🎨', bg: 'bg-red-50', iconBg: 'bg-red-100' },
  { id: 'Carpenter', labelEn: 'Carpenter', labelHe: 'נגר', labelAr: 'نجار', icon: '🪚', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
  { id: 'Landscaper', labelEn: 'Landscaper', labelHe: 'גנן', labelAr: 'مزارع', icon: '🌳', bg: 'bg-green-50', iconBg: 'bg-green-100' },
  { id: 'Cleaner', labelEn: 'Cleaner', labelHe: 'מנקה', labelAr: 'عمّال نظافة', icon: '🧹', bg: 'bg-teal-50', iconBg: 'bg-teal-100' },
  { id: 'AC Technician', labelEn: 'AC Technician', labelHe: 'טכנאי מזגנים', labelAr: 'تكييف', icon: '❄️', bg: 'bg-sky-50', iconBg: 'bg-sky-100' },
  { id: 'Handyman', labelEn: 'Handyman', labelHe: 'הנדימן', labelAr: 'عامل صيانة', icon: '🧰', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100' },
];

const categoryStyles = [
  { bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', icon: '⚡' },
  { bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: '🔧' },
  { bg: 'bg-red-50', iconBg: 'bg-red-100', icon: '🎨' },
  { bg: 'bg-amber-50', iconBg: 'bg-amber-100', icon: '🪚' },
  { bg: 'bg-green-50', iconBg: 'bg-green-100', icon: '🌳' },
  { bg: 'bg-teal-50', iconBg: 'bg-teal-100', icon: '🧹' },
  { bg: 'bg-sky-50', iconBg: 'bg-sky-100', icon: '❄️' },
  { bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', icon: '🧰' },
];

const iconByProfession = {
  'ac technician': '❄️',
  carpenter: '🪚',
  cleaner: '🧹',
  electrician: '⚡',
  'flooring expert': '🧱',
  handyman: '🧰',
  landscaper: '🌳',
  mover: '📦',
  painter: '🎨',
  'pest control': '🛡️',
  plumber: '🔧',
  roofer: '🏠',
};

function getLabel(cat, locale) {
  if (locale === 'he') return cat.labelHe || cat.he || cat.labelEn || cat.en || cat.id;
  if (locale === 'ar') return cat.labelAr || cat.ar || cat.labelEn || cat.en || cat.id;
  return cat.labelEn || cat.en || cat.id;
}

export default function CategoryGrid({ showAll = false }) {
  const { t, locale } = useLanguage();
  const [categories, setCategories] = useState(fallbackCategories);
  const displayed = showAll ? categories : categories.slice(0, 8);

  useEffect(() => {
    let isMounted = true;

    async function loadPopularCategories() {
      try {
        const [analyticsSnapshot, professionsSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'metadata', 'analytics', 'professions'),
            orderBy('searchCount', 'desc'),
            limit(showAll ? 50 : 8)
          )),
          getDoc(doc(db, 'metadata', 'professions')),
        ]);

        if (!isMounted) return;

        const professionItems = professionsSnapshot.data()?.items || [];
        const professionByEnglishName = professionItems.reduce((acc, item) => {
          const key = String(item.en || item.logo || '').toLowerCase();
          if (key) acc[key] = item;
          return acc;
        }, {});

        const nextCategories = analyticsSnapshot.docs.map((categoryDoc, index) => {
          const data = categoryDoc.data();
          const baseName = categoryDoc.id;
          const professionData = professionByEnglishName[baseName.toLowerCase()] || {};
          const style = categoryStyles[index % categoryStyles.length];

          return {
            id: baseName,
            labelEn: professionData.en || baseName,
            labelHe: professionData.he || baseName,
            labelAr: professionData.ar || baseName,
            searchCount: data.searchCount || 0,
            bg: style.bg,
            iconBg: style.iconBg,
            icon: iconByProfession[baseName.toLowerCase()] || style.icon,
          };
        });

        if (nextCategories.length > 0) {
          setCategories(nextCategories);
        }
      } catch (error) {
        if (isMounted) {
          setCategories(fallbackCategories);
        }
      }
    }

    loadPopularCategories();

    return () => {
      isMounted = false;
    };
  }, [showAll]);

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
            href={`/search?q=${encodeURIComponent(cat.labelEn || cat.id)}`}
            className={`${cat.bg} card-lift group relative overflow-hidden rounded-[26px] border border-white/70 p-4 shadow-card cursor-pointer animate-fade-up`}
            style={{ animationDelay: `${categories.indexOf(cat) * 70}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/60 to-transparent opacity-80" />
            <div className={`${cat.iconBg} relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}>
              {cat.icon}
            </div>
            <span className="relative line-clamp-2 text-sm font-bold text-gray-800 leading-tight">
              {getLabel(cat, locale)}
            </span>
            <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Explore</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

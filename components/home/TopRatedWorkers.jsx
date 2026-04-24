import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTopRatedWorkers } from '../../lib/firestore';
import WorkerCard from '../workers/WorkerCard';
import { useLanguage } from '../../contexts/LanguageContext';

function SkeletonCard() {
  return (
    <div className="min-w-[240px] rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-card">
      <div className="skeleton mx-auto mb-4 h-20 w-20 rounded-full" />
      <div className="skeleton mx-auto mb-3 h-4 w-3/4 rounded-full" />
      <div className="skeleton mx-auto mb-2 h-3 w-1/2 rounded-full" />
      <div className="skeleton mx-auto h-3 w-2/3 rounded-full" />
    </div>
  );
}

export default function TopRatedWorkers() {
  const { t }                = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopRatedWorkers(10)
      .then(setWorkers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="px-4 md:px-0 animate-fade-up delay-300">
      <div className="relative overflow-hidden rounded-[32px] bg-white px-5 py-6 shadow-card sm:px-6">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.24em] text-primary/65">Handpicked talent</p>
            <h2 className="section-title">{t.home.topRated}</h2>
          </div>
          <Link href="/search" className="text-sm font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5">
            {t.home.seeAll}
          </Link>
        </div>

        <div className="relative flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : workers.map((w) => (
              <div key={w.uid} className="shrink-0 w-[240px]">
                <WorkerCard worker={w} compact />
              </div>
            ))}

        {!loading && workers.length === 0 && (
          <p className="w-full py-10 text-center text-sm text-gray-400">{t.common.error}</p>
        )}
        </div>
      </div>
    </section>
  );
}

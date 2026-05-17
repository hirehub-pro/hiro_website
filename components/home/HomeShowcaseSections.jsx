import Link from 'next/link';
import { useRef } from 'react';
import {
  HiArrowRight,
  HiChevronLeft,
  HiChevronRight,
  HiCheckCircle,
  HiCog,
  HiHome,
  HiLightBulb,
  HiScale,
  HiSparkles,
  HiWrenchScrewdriver,
  HiOutlineWindow,
  HiWindow,
} from 'react-icons/hi2';
import { useLanguage } from '../../contexts/LanguageContext';

const workCards = [
  {
    title: 'Build or repair a roof',
    description: 'Compare roof directions, materials, and typical project paths before you choose a pro.',
    badge: 'Project',
    action: 'View options',
    profession: 'Roofer',
    icon: HiHome,
    gradient: 'from-[#0f3d91] via-[#2563eb] to-[#38bdf8]',
  },
  {
    title: 'Water leak repair',
    description: 'Find the right plumber fast for urgent leaks, pressure issues, and hidden damage.',
    badge: 'Plumber',
    action: 'Find a pro',
    profession: 'Plumber',
    icon: HiWrenchScrewdriver,
    gradient: 'from-[#0f766e] via-[#0ea5a4] to-[#67e8f9]',
  },
  {
    title: 'Power and outlet issues',
    description: 'Get help for overloads, failing outlets, flickering lights, and safer upgrades.',
    badge: 'Electrician',
    action: 'Find a pro',
    profession: 'Electrician',
    icon: HiLightBulb,
    gradient: 'from-[#7c2d12] via-[#ea580c] to-[#fbbf24]',
  },
  {
    title: 'Deep home refresh',
    description: 'From move-in cleanup to post-renovation care, book the right team in one step.',
    badge: 'Home care',
    action: 'Explore',
    profession: 'Cleaner',
    icon: HiSparkles,
    gradient: 'from-[#4c1d95] via-[#7c3aed] to-[#c084fc]',
  },
];

const professionalCards = [
  {
    title: 'Private lessons or tutoring',
    description: 'English, math, languages, exam prep, and one-on-one support for students.',
    badge: 'Teacher',
    action: 'Find pros',
    profession: 'Private Teacher',
    icon: HiSparkles,
    gradient: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Legal consulting',
    description: 'Contracts, claims, work questions, and fast guidance when you need clarity.',
    badge: 'Legal',
    action: 'Find pros',
    profession: 'Lawyer',
    icon: HiScale,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#475569]',
  },
  {
    title: 'Wellness and therapy',
    description: 'Support for mental health, personal wellness, and family care in one place.',
    badge: 'Wellness',
    action: 'Explore',
    profession: 'Therapist',
    icon: HiCheckCircle,
    gradient: 'from-[#14532d] via-[#16a34a] to-[#86efac]',
  },
  {
    title: 'Design and branding',
    description: 'Logos, social visuals, menus, and branded assets for your business or project.',
    badge: 'Creative',
    action: 'Find pros',
    profession: 'Graphic Designer',
    icon: HiCog,
    gradient: 'from-[#831843] via-[#db2777] to-[#f9a8d4]',
  },
];

const maintenanceCards = [
  {
    title: 'Clean AC filters',
    description: 'A simple seasonal fix that improves airflow, cooling, and indoor comfort.',
    badge: 'AC Technician',
    action: 'Find a pro',
    profession: 'AC Technician',
    icon: HiCog,
    gradient: 'from-[#0f766e] via-[#0ea5a4] to-[#67e8f9]',
  },
  {
    title: 'Check water leaks',
    description: 'Catch weak seals and hidden drip points before they become costly repairs.',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    profession: 'Plumber',
    icon: HiCheckCircle,
    gradient: 'from-[#1d4ed8] via-[#3b82f6] to-[#93c5fd]',
  },
  {
    title: 'Inspect outdoor drainage',
    description: 'Keep balconies, yards, and roof drains clear before heavy weather hits.',
    badge: 'Preventive',
    action: 'Explore',
    profession: 'Plumber',
    icon: HiWrenchScrewdriver,
    gradient: 'from-[#334155] via-[#475569] to-[#94a3b8]',
  },
  {
    title: 'Test lights and switches',
    description: 'A fast safety check for loose fittings, weak lighting, and failing switches.',
    badge: 'Electrical',
    action: 'Find a pro',
    profession: 'Electrician',
    icon: HiLightBulb,
    gradient: 'from-[#92400e] via-[#d97706] to-[#fde68a]',
  },
    {
    title: 'Tune up doors and windows',
    description: 'Fix squeaks , poor closing , and air or dust coming inside.',
    badge: 'AC Technician',
    action: 'Find a pro',
    profession: 'AC Technician',
    icon: HiWindow,
    gradient: 'from-[#0f766e] via-[#0ea5a4] to-[#67e8f9]',
  },
   
  {
    title: 'Check home appliances',
    description: 'spot noise , leaks , or weak performance.',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    profession: 'Appliance Technician',
    icon: HiCheckCircle,
    gradient: 'from-[#1d4ed8] via-[#3b82f6] to-[#93c5fd]',
  },
  {
    title: 'Preventive pest treatment',
    description: 'A smart seasonal check before insects or rodents become a problem.',
    badge: 'Preventive',
    action: 'Explore',
    profession: 'Pest Control',
    icon: HiWrenchScrewdriver,
    gradient: 'from-[#831843] via-[#db2777] to-[#f9a8d4]',
  },
  {
    title: 'Test lights and switches',
    description: 'A fast safety check for loose fittings, weak lighting, and failing switches.',
    badge: 'Electrical',
    action: 'Find a pro',
    profession: 'Electrician',
    icon: HiLightBulb,
    gradient: 'from-[#92400e] via-[#d97706] to-[#fde68a]',
  },
    {
    title: 'Clean AC filters',
    description: 'A simple seasonal fix that improves airflow, cooling, and indoor comfort.',
    badge: 'AC Technician',
    action: 'Find a pro',
    profession: 'AC Technician',
    icon: HiCog,
    gradient: 'from-[#0f766e] via-[#0ea5a4] to-[#67e8f9]',
  },
  {
    title: 'Check water leaks',
    description: 'Catch weak seals and hidden drip points before they become costly repairs.',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    profession: 'Plumber',
    icon: HiCheckCircle,
    gradient: 'from-[#1d4ed8] via-[#3b82f6] to-[#93c5fd]',
  },
  {
    title: 'Inspect outdoor drainage',
    description: 'Keep balconies, yards, and roof drains clear before heavy weather hits.',
    badge: 'Preventive',
    action: 'Explore',
    profession: 'Plumber',
    icon: HiWrenchScrewdriver,
    gradient: 'from-[#334155] via-[#475569] to-[#94a3b8]',
  },
  {
    title: 'Test lights and switches',
    description: 'A fast safety check for loose fittings, weak lighting, and failing switches.',
    badge: 'Electrical',
    action: 'Find a pro',
    profession: 'Electrician',
    icon: HiLightBulb,
    gradient: 'from-[#92400e] via-[#d97706] to-[#fde68a]',
  },
];

function ShowcaseCard({ card, accent }) {
  const Icon = card.icon;
  const href = `/search?q=${encodeURIComponent(card.profession || card.title)}`;

  return (
    <Link href={href} className="block h-full">
      <article className="group relative flex min-h-[280px] h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/50 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-6">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.gradient}`} />
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-2xl`} />

        <div className="relative flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg shadow-slate-200/70`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${accent.badge}`}>
            {card.badge}
          </span>
        </div>

        <div className="relative pt-6">
          <h3 className="max-w-[18ch] text-[1.55rem] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[1.75rem]">
            {card.title}
          </h3>
          <p className="mt-3 max-w-[30ch] text-sm leading-6 text-slate-600 sm:text-[0.98rem]">
            {card.description}
          </p>
        </div>

        <div className="relative flex items-center justify-between pt-6">
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ${accent.cta}`}>
            {card.action}
          </span>
          <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-1 ${accent.arrow}`}>
            <HiArrowRight className="h-5 w-5" />
          </div>
        </div>
      </article>
    </Link>
  );
}

function SectionBlock({ eyebrow, title, subtitle, support, cards, accent }) {
  const railRef = useRef(null);

  function scrollCards(direction) {
    const rail = railRef.current;
    if (!rail) return;

    const distance = Math.min(rail.clientWidth * 0.92, 420);
    rail.scrollBy({
      left: direction === 'next' ? distance : -distance,
      behavior: 'smooth',
    });
  }

  return (
    <section className="animate-fade-up px-4 md:px-0">
      <div className={`relative overflow-hidden rounded-[34px] border ${accent.frame} px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${accent.panel}`} />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-36 w-36 rounded-full bg-white/25 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className={`mb-3 text-xs font-black uppercase tracking-[0.24em] ${accent.eyebrow}`}>
                {eyebrow}
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.8rem]">
                {title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                {subtitle}
              </p>
            </div>

            <div className={`max-w-md rounded-[24px] border px-5 py-4 ${accent.supportBox}`}>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Quick direction
              </p>
              <p className="mt-2 text-lg font-extrabold leading-snug text-slate-900 sm:text-[1.35rem]">
                {support}
              </p>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">
              Swipe to explore
            </p>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollCards('prev')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 transition hover:bg-white hover:text-slate-900"
                aria-label={`Scroll ${title} left`}
              >
                <HiChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollCards('next')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 transition hover:bg-white hover:text-slate-900"
                aria-label={`Scroll ${title} right`}
              >
                <HiChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={railRef}
            className="-mx-2 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-3 scrollbar-hide sm:-mx-1 sm:px-1"
          >
            {cards.map((card) => (
              <div
                key={`${title}_${card.title}`}
                className="min-w-[84%] snap-center sm:min-w-[360px] lg:min-w-[380px]"
              >
                <ShowcaseCard card={card} accent={accent} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeShowcaseSections() {
  const { t } = useLanguage();

  return (
    <div className="space-y-10 md:space-y-12">
      <SectionBlock
        eyebrow="Browse by need"
        title={t.home.whatWorkTitle}
        subtitle={t.home.whatWorkSubtitle}
        support={t.home.whatWorkSupport}
        cards={workCards}
        accent={{
          frame: 'border-[#dbeafe]',
          panel: 'from-[#f8fbff] via-[#eef6ff] to-[#f4fbff]',
          eyebrow: 'text-[#2563eb]',
          supportBox: 'border-white/70 bg-white/70 shadow-sm',
          badge: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
          cta: 'bg-[#eff6ff] text-[#1d4ed8]',
          arrow: 'bg-[#eff6ff] text-[#1d4ed8]',
        }}
      />

      <SectionBlock
        eyebrow="More options"
        title={t.home.otherServicesTitle}
        subtitle={t.home.otherServicesSubtitle}
        support={t.home.otherServicesSupport}
        cards={professionalCards}
        accent={{
          frame: 'border-[#e9d5ff]',
          panel: 'from-[#fcfaff] via-[#f7f1ff] to-[#fff8fb]',
          eyebrow: 'text-[#7c3aed]',
          supportBox: 'border-white/70 bg-white/75 shadow-sm',
          badge: 'border-[#e9d5ff] bg-[#faf5ff] text-[#7c3aed]',
          cta: 'bg-[#faf5ff] text-[#7c3aed]',
          arrow: 'bg-[#faf5ff] text-[#7c3aed]',
        }}
      />

      <SectionBlock
        eyebrow="Seasonal care"
        title={t.home.maintenanceTitle}
        subtitle={t.home.maintenanceSubtitle}
        support={t.home.maintenanceSupport}
        cards={maintenanceCards}
        accent={{
          frame: 'border-[#d1fae5]',
          panel: 'from-[#f7fffb] via-[#effcf7] to-[#f5fffd]',
          eyebrow: 'text-[#0f766e]',
          supportBox: 'border-white/70 bg-white/75 shadow-sm',
          badge: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#0f766e]',
          cta: 'bg-[#ecfdf5] text-[#0f766e]',
          arrow: 'bg-[#ecfdf5] text-[#0f766e]',
        }}
      />
    </div>
  );
}

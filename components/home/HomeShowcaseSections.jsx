import { HiArrowRight, HiCheckCircle, HiCog, HiHome, HiSparkles, HiScale } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';

const workCards = [
  
  {
    title: 'Build or repair a roof',
    description: 'Explore roof types before choosing the right pro',
    badge: 'Project',
    action: 'View options',
    icon: HiHome,
    gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]',
  },
  {
    title: 'Water leak repair',
    description: 'Need a plumber to inspect, fix, and protect your home',
    badge: 'Plumber',
    action: 'View options',
    icon: HiCog,
    gradient: 'from-[#0891b2] via-[#0ea5e9] to-[#2563eb]',
  },
 
  {
    title: 'Build or repair a roof',
    description: 'Explore roof types before choosing the right pro',
    badge: 'Project',
    action: 'View options',
    icon: HiHome,
    gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]',
  },
  {
    title: 'Water leak repair',
    description: 'Need a plumber to inspect, fix, and protect your home',
    badge: 'Plumber',
    action: 'View options',
    icon: HiCog,
    gradient: 'from-[#0891b2] via-[#0ea5e9] to-[#2563eb]',
  },
 
  {
    title: 'Build or repair a roof',
    description: 'Explore roof types before choosing the right pro',
    badge: 'Project',
    action: 'View options',
    icon: HiHome,
    gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]',
  },
  {
    title: 'Water leak repair',
    description: 'Need a plumber to inspect, fix, and protect your home',
    badge: 'Plumber',
    action: 'View options',
    icon: HiCog,
    gradient: 'from-[#0891b2] via-[#0ea5e9] to-[#2563eb]',
  },
 
  {
    title: 'Build or repair a roof',
    description: 'Explore roof types before choosing the right pro',
    badge: 'Project',
    action: 'View options',
    icon: HiHome,
    gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]',
  },
  {
    title: 'Water leak repair',
    description: 'Need a plumber to inspect, fix, and protect your home',
    badge: 'Plumber',
    action: 'View options',
    icon: HiCog,
    gradient: 'from-[#0891b2] via-[#0ea5e9] to-[#2563eb]',
  },

];

const professionalCards = [

  {
    title: 'Private lessons or tutoring',
    description: 'English, math, languages, exam prep, or student support',
    badge: 'Private Teacher',
    action: 'Find pros',
    icon: HiSparkles,
    gradient: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Legal consulting',
    description: 'Contracts, claims, labor, or a quick filing question',
    badge: 'Service',
    action: 'Find pros',
    icon: HiScale,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
  },
  
  {
    title: 'Private lessons or tutoring',
    description: 'English, math, languages, exam prep, or student support',
    badge: 'Private Teacher',
    action: 'Find pros',
    icon: HiSparkles,
    gradient: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Legal consulting',
    description: 'Contracts, claims, labor, or a quick filing question',
    badge: 'Service',
    action: 'Find pros',
    icon: HiScale,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
  },
  
  {
    title: 'Private lessons or tutoring',
    description: 'English, math, languages, exam prep, or student support',
    badge: 'Private Teacher',
    action: 'Find pros',
    icon: HiSparkles,
    gradient: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Legal consulting',
    description: 'Contracts, claims, labor, or a quick filing question',
    badge: 'Service',
    action: 'Find pros',
    icon: HiScale,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
  },
  
  {
    title: 'Private lessons or tutoring',
    description: 'English, math, languages, exam prep, or student support',
    badge: 'Private Teacher',
    action: 'Find pros',
    icon: HiSparkles,
    gradient: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Legal consulting',
    description: 'Contracts, claims, labor, or a quick filing question',
    badge: 'Service',
    action: 'Find pros',
    icon: HiScale,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]',
  },
  
];

const maintenanceCards = [

  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
  {
    title: 'Clean AC filters',
    description: 'Improve cooling and air quality at home',
    badge: 'AC Technician',
    action: 'Find a pro',
    icon: HiCog,
    gradient: 'from-[#0ea5e9] via-[#1d9bf0] to-[#38bdf8]',
  },
  {
    title: 'Check water leaks',
    description: 'Prevent leaks before they get expensive',
    badge: 'Seasonal pick',
    action: 'Find a pro',
    icon: HiCheckCircle,
    gradient: 'from-[#2563eb] via-[#3b82f6] to-[#4f46e5]',
  },
  
];

function ShowcaseCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="card-lift relative flex shrink-0 min-h-[320px] w-[290px] flex-col justify-between overflow-hidden rounded-[32px] p-5 text-white shadow-card sm:w-[340px] lg:w-[360px] sm:p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_52%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white/95 shadow-sm backdrop-blur-sm">
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white/95 backdrop-blur-sm">
          {card.badge}
        </span>
      </div>

      <div className="relative pt-7">
        <h3 className="max-w-[14ch] text-[1.9rem] font-extrabold leading-[0.96] tracking-tight sm:text-[2.2rem]">
          {card.title}
        </h3>
        <p className="mt-4 max-w-[18ch] text-sm leading-6 text-white/90 sm:text-base">
          {card.description}
        </p>
      </div>

      <div className="relative flex items-center justify-between pt-8">
        <span className="rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white/95 backdrop-blur-sm">
          {card.action}
        </span>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          <HiArrowRight className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}

function SectionBlock({ eyebrow, title, subtitle, support, cards }) {
  return (
    <section className="px-4 md:px-0 animate-fade-up">
      <div className="mb-5 sm:mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-primary/70">
          {eyebrow}
        </p>
        <h2 className="section-title text-3xl sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-500 sm:text-[1.45rem]">
          {subtitle}
        </p>
        <p className="mt-6 max-w-4xl text-2xl font-extrabold leading-tight text-primary sm:text-[2rem]">
          {support}
        </p>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:px-0">
        {cards.map((card) => (
          <ShowcaseCard key={card.title} card={card} />
        ))}
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
      />

      <SectionBlock
        eyebrow="More options"
        title={t.home.otherServicesTitle}
        subtitle={t.home.otherServicesSubtitle}
        support={t.home.otherServicesSupport}
        cards={professionalCards}
      />

      <SectionBlock
        eyebrow="Seasonal care"
        title={t.home.maintenanceTitle}
        subtitle={t.home.maintenanceSubtitle}
        support={t.home.maintenanceSupport}
        cards={maintenanceCards}
      />
    </div>
  );
}

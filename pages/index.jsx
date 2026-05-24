import Head from 'next/head';
import Link from 'next/link';
import { HiCheckCircle, HiLightningBolt, HiShieldCheck, HiSparkles } from 'react-icons/hi';
import SearchBar from '../components/home/SearchBar';
import CategoryGrid from '../components/home/CategoryGrid';
import HomeShowcaseSections from '../components/home/HomeShowcaseSections';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SEO_TITLE = 'Hiro - מצאו בעלי מקצוע לידכם | חשמלאי, אינסטלטור, שיפוצים ועוד';
const SEO_DESCRIPTION = 'Hiro עוזר לכם למצוא בעלי מקצוע אמינים לידכם במהירות. חפשו חשמלאי, אינסטלטור, שיפוצניק, מנקה, טכנאי, הובלות ועוד בעלי מקצוע מומלצים באזור שלכם.';
const SEO_KEYWORDS = [
  'בעלי מקצוע',
  'בעלי מקצוע לידכם',
  'מצאו בעלי מקצוע',
  'חיפוש בעלי מקצוע',
  'בעלי מקצוע מומלצים',
  'חשמלאי',
  'אינסטלטור',
  'שיפוצים',
  'שיפוצניק',
  'מנקה',
  'טכנאי מזגנים',
  'טכנאי',
  'הנדימן',
  'הובלות',
  'צבעי',
  'גנן',
  'מנעולן',
  'קבלן',
  'נותני שירות',
  'שירותים לבית',
  'אנשי מקצוע בישראל',
  'find professionals near me',
  'local services',
  'home services',
].join(', ');
const SITE_NAME = 'הירו';
const SITE_ALTERNATE_NAME = 'הירו';
const HOMEPAGE_URL = 'https://hiro-services.com/';
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      url: HOMEPAGE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
    },
    {
      '@type': 'Organization',
      url: HOMEPAGE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
    },
  ],
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const firstName = profile?.name?.split(' ')[0] || '';
  const trustPoints = [
    { icon: HiCheckCircle, label: t.home.trustVerified },
    { icon: HiLightningBolt, label: t.home.trustFast },
    { icon: HiShieldCheck, label: t.home.trustReliable },
  ];

  return (
    <>
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta name="keywords" content={SEO_KEYWORDS} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={HOMEPAGE_URL} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <link rel="canonical" href={HOMEPAGE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <div className="relative overflow-hidden px-4 pb-10 pt-4 md:pb-14">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute -top-8 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute left-0 top-40 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl animate-float-slow" />

        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="overflow-hidden rounded-[36px] bg-hero-gradient px-6 py-8 text-white shadow-hero sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="absolute inset-0 opacity-20" />
            <div className="relative max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/90 animate-fade-in">
                <HiSparkles className="h-4 w-4" />
                {t.home.heroBadge}
              </div>

              {user && (
                <p className="mb-3 text-base font-medium text-white/80 animate-fade-up">
                  {t.home.greeting}{firstName ? `, ${firstName}` : ''}
                </p>
              )}

              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white animate-fade-up delay-100 sm:text-5xl lg:text-6xl">
                {t.home.question}
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 animate-fade-up delay-150 sm:text-base">
                {t.home.heroDescription}
              </p>

              <div className="mt-6 animate-fade-up delay-200">
                <SearchBar />
              </div>

              <div className="mt-6 flex flex-wrap gap-3 animate-fade-up delay-300">
                {trustPoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="glass-blue rounded-full px-4 py-2 text-xs font-semibold text-white/90">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="glass rounded-[32px] p-6 shadow-soft animate-slide-left">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/65">{t.home.whyBadge}</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-gray-950">{t.home.whyTitle}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white/80 p-4">
                  <p className="text-3xl font-extrabold text-primary">10k+</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t.home.statSearches}</p>
                </div>
                <div className="rounded-3xl bg-white/80 p-4">
                  <p className="text-3xl font-extrabold text-primary">4.9</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t.home.statRating}</p>
                </div>
              </div>
              <Link href="/search" className="btn-primary mt-5 inline-flex items-center justify-center">
                {t.home.exploreProfessionals}
              </Link>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-card animate-slide-left delay-150">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/65">{t.home.clarityBadge}</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary dot-active" />
                  <div>
                    <p className="font-bold text-gray-900">{t.home.clarityBrowseTitle}</p>
                    <p className="text-sm text-gray-500">{t.home.clarityBrowseBody}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/40" />
                  <div>
                    <p className="font-bold text-gray-900">{t.home.clarityDecisionsTitle}</p>
                    <p className="text-sm text-gray-500">{t.home.clarityDecisionsBody}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/40" />
                  <div>
                    <p className="font-bold text-gray-900">{t.home.clarityExperienceTitle}</p>
                    <p className="text-sm text-gray-500">{t.home.clarityExperienceBody}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-0 pb-28 md:pb-14">
        <CategoryGrid />
        <HomeShowcaseSections />
      </div>
    </>
  );
}

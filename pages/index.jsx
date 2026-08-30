import Head from 'next/head';
import Link from 'next/link';
import {
  HiArrowNarrowLeft,
  HiBriefcase,
  HiCheckCircle,
  HiLightningBolt,
  HiShieldCheck,
  HiSparkles,
  HiUser,
} from 'react-icons/hi';
import SearchBar from '../components/home/SearchBar';
import HomeAccountWindow from '../components/home/HomeAccountWindow';
import HomeShowcaseSections from '../components/home/HomeShowcaseSections';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SEO_TITLE = 'הירו | מצאו בעלי מקצוע לידכם';
const SEO_DESCRIPTION = 'הירו עוזר לכם למצוא בעלי מקצוע אמינים לידכם במהירות. חפשו חשמלאי, אינסטלטור, שיפוצניק, מנקה, טכנאי, הובלות ועוד בעלי מקצוע מומלצים באזור שלכם.';
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
const SITE_ALTERNATE_NAME = 'hiro';
const HOMEPAGE_URL = 'https://hiro-services.com/';
const LOGO_URL = 'https://hiro-services.com/web-app-manifest-512x512.png';
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${HOMEPAGE_URL}#website`,
      url: HOMEPAGE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
    },
    {
      '@type': 'Organization',
      '@id': `${HOMEPAGE_URL}#organization`,
      url: HOMEPAGE_URL,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: LOGO_URL,
      },
      image: LOGO_URL,
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
  const customerReasons = [
    { title: t.home.customerCompareTitle, body: t.home.customerCompareBody },
    { title: t.home.customerRequestTitle, body: t.home.customerRequestBody },
    { title: t.home.customerHistoryTitle, body: t.home.customerHistoryBody },
  ];
  const professionalReasons = [
    { title: t.home.professionalProfileTitle, body: t.home.professionalProfileBody },
    { title: t.home.professionalLeadTitle, body: t.home.professionalLeadBody },
    { title: t.home.professionalBusinessTitle, body: t.home.professionalBusinessBody },
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
        <meta property="og:image" content={LOGO_URL} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <meta name="twitter:image" content={LOGO_URL} />
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

        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
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

              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
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

            <HomeAccountWindow />
          </div>

          <aside aria-labelledby="why-hiro-title" className="glass rounded-[36px] p-6 shadow-soft animate-slide-left sm:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/65">{t.home.whyBadge}</p>
              <h2 id="why-hiro-title" className="mt-2 font-display text-2xl font-extrabold leading-tight text-gray-950 sm:text-3xl">{t.home.whyTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{t.home.whyIntro}</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                    <HiUser className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-primary">{t.home.customerLabel}</p>
                    <h3 className="text-lg font-extrabold text-gray-950">{t.home.customerTitle}</h3>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {customerReasons.map(({ title, body }) => (
                    <li key={title} className="flex items-start gap-3">
                      <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-gray-600">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/search" className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2">
                  {t.home.customerCta}
                  <HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </article>

              <article className="rounded-[28px] bg-slate-950 p-5 text-white shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
                    <HiBriefcase className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-sky-300">{t.home.professionalLabel}</p>
                    <h3 className="text-lg font-extrabold text-white">{t.home.professionalTitle}</h3>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {professionalReasons.map(({ title, body }) => (
                    <li key={title} className="flex items-start gap-3">
                      <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                      <div>
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-300">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-50">
                  {t.home.professionalCta}
                  <HiArrowNarrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </article>
            </div>
          </aside>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-0 pb-28 md:pb-14">
        <HomeShowcaseSections />
      </div>
    </>
  );
}

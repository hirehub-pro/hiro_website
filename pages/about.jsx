import Head from 'next/head';
import AboutPageContent, { getAboutFaqStructuredData } from '../components/about/AboutPageContent';
import { useLanguage } from '../contexts/LanguageContext';
import { absoluteUrl } from '../lib/seo-locale';

const SEO_TITLE = 'אודות Hiro | בעלי מקצוע, ניהול עבודה ומסמכים דיגיטליים';
const SEO_DESCRIPTION = 'הכירו את Hiro: חיפוש בעלי מקצוע, פרופילים וביקורות, בקשות והודעות ללקוחות; ניהול לקוחות, מסמכים, מספרי הקצאה וחתימות לעסקים.';
const SEO_KEYWORDS = 'אודות Hiro, הירו בעלי מקצוע, אפליקציה לבעלי מקצוע, מציאת בעלי מקצוע, ניהול עבודה, ניהול לקוחות, חשבוניות דיגיטליות, מספר הקצאה, חתימה על הצעת מחיר';
const PAGE_URL = absoluteUrl('/about');
const SHARE_IMAGE_URL = absoluteUrl('/web-app-manifest-512x512.png');
const faqStructuredData = getAboutFaqStructuredData();
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${PAGE_URL}#about`,
      url: PAGE_URL,
      name: SEO_TITLE,
      description: SEO_DESCRIPTION,
      isPartOf: { '@id': `${absoluteUrl('/')}#website` },
      about: { '@id': `${absoluteUrl('/')}#organization` },
      inLanguage: 'he-IL',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'עמוד הבית', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'אודות Hiro', item: PAGE_URL },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${PAGE_URL}#faq`,
      mainEntity: faqStructuredData.mainEntity,
    },
  ],
};

export default function AboutPage() {
  const { t, locale } = useLanguage();

  return (
    <>
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta name="keywords" content={SEO_KEYWORDS} />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:image" content={SHARE_IMAGE_URL} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <meta name="twitter:image" content={SHARE_IMAGE_URL} />
        <link rel="canonical" href={PAGE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <AboutPageContent locale={locale} backToSettingsLabel={t.aboutPage.backToSettings} />
    </>
  );
}

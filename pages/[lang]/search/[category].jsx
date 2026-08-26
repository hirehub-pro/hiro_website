import Head from 'next/head';
import SearchPageContent from '../../../components/search/SearchPageContent';
import { getProfessionBySlug, PROFESSION_CATALOG } from '../../../lib/profession-catalog';
import { getProfessionPageContent } from '../../../lib/profession-page-content';
import {
  absoluteUrl,
  buildAlternateLanguageUrls,
  normalizeSeoLocale,
  SEO_DEFAULT_LOCALE,
  SEO_LOCALES,
} from '../../../lib/seo-locale';

export default function LocalizedSearchCategoryPage({ locale, categorySlug, profession }) {
  const path = `/search/${categorySlug}`;
  const alternateUrls = buildAlternateLanguageUrls(path);
  const canonicalUrl = absoluteUrl(`/${locale}${path}`);
  const seo = getProfessionPageContent(profession, locale);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: seo.breadcrumbHome, item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: seo.breadcrumbSearch, item: absoluteUrl(`/${locale}/search`) },
        { '@type': 'ListItem', position: 3, name: seo.name, item: canonicalUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: seo.name,
      description: seo.description,
      url: canonicalUrl,
      areaServed: { '@type': 'Country', name: 'Israel' },
      provider: { '@type': 'Organization', '@id': 'https://hiro-services.com/#organization', name: 'Hiro' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seo.questions.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];

  return ( 
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
        {alternateUrls.map((alternate) => (
          <link
            key={alternate.locale}
            rel="alternate"
            hrefLang={alternate.locale}
            href={alternate.href}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={absoluteUrl(path)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <SearchPageContent categorySlug={categorySlug} profession={profession} />
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: SEO_LOCALES
      .filter((locale) => locale !== SEO_DEFAULT_LOCALE)
      .flatMap((lang) => PROFESSION_CATALOG.map(({ slug }) => ({
        params: { lang, category: slug },
      }))),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const locale = normalizeSeoLocale(params?.lang);
  const categorySlug = String(params?.category || '').trim().toLowerCase();
  const profession = getProfessionBySlug(categorySlug);

  if (locale === SEO_DEFAULT_LOCALE || locale !== params?.lang || !profession) {
    return { notFound: true };
  }

  return {
    props: {
      locale,
      categorySlug,
      profession,
    },
  };
}

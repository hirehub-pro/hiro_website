import Head from 'next/head';
import SearchPageContent from '../../components/search/SearchPageContent';
import { absoluteUrl, buildAlternateLanguageUrls } from '../../lib/seo-locale';
import { getProfessionBySlug, PROFESSION_CATALOG } from '../../lib/profession-catalog';
import { getProfessionPageContent } from '../../lib/profession-page-content';

export default function SearchCategoryPage({
  categorySlug,
  profession,
  path,
  alternateUrls,
}) {
  const seo = getProfessionPageContent(profession, 'he');
  const canonicalUrl = absoluteUrl(path);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: seo.breadcrumbHome, item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: seo.breadcrumbSearch, item: absoluteUrl('/search') },
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
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
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
    paths: PROFESSION_CATALOG.map(({ slug }) => ({ params: { category: slug } })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const categorySlug = String(params?.category || '').trim().toLowerCase();
  const profession = getProfessionBySlug(categorySlug);
  if (!profession) return { notFound: true };
  const path = `/search/${categorySlug}`;

  return {
    props: {
      categorySlug,
      profession,
      path,
      alternateUrls: buildAlternateLanguageUrls(path),
    },
  };
}

import Head from 'next/head';
import SearchPageContent from '../../components/search/SearchPageContent';
import {
  absoluteUrl,
  buildAlternateLanguageUrls,
  SEO_DEFAULT_LOCALE,
  SEO_LOCALES,
} from '../../lib/seo-locale';

export default function LocalizedSearchPage({ locale }) {
  const alternateUrls = buildAlternateLanguageUrls('/search');
  const canonicalUrl = absoluteUrl(locale === 'he' ? '/search' : `/${locale}/search`);

  return (
    <>
      <Head>
        <title>Search | Hiro</title>
        <link rel="canonical" href={canonicalUrl} />
        {alternateUrls.map((alternate) => (
          <link
            key={alternate.locale}
            rel="alternate"
            hrefLang={alternate.locale}
            href={alternate.href}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={absoluteUrl('/search')} />
      </Head>
      <SearchPageContent />
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: SEO_LOCALES
      .filter((lang) => lang !== SEO_DEFAULT_LOCALE)
      .map((lang) => ({ params: { lang } })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const locale = params?.lang;

  return {
    props: {
      locale,
    },
  };
}

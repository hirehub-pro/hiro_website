import Head from 'next/head';
import SearchPageContent from '../../components/search/SearchPageContent';
import { absoluteUrl, buildAlternateLanguageUrls, normalizeSeoLocale } from '../../lib/seo-locale';

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

export async function getServerSideProps({ params }) {
  const locale = normalizeSeoLocale(params?.lang);

  if (locale === 'he') {
    return {
      redirect: {
        destination: '/search',
        permanent: true,
      },
    };
  }

  if (locale !== params?.lang) {
    return { notFound: true };
  }

  return {
    props: {
      locale,
    },
  };
}

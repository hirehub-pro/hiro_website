import Head from 'next/head';
import SearchPageContent from '../components/search/SearchPageContent';
import { absoluteUrl, buildAlternateLanguageUrls } from '../lib/seo-locale';
import { getSearchPageSeo } from '../lib/page-seo';

export default function SearchPage({ alternateUrls }) {
  const seo = getSearchPageSeo();

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl('/search')} />
        <link rel="canonical" href={absoluteUrl('/search')} />
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

export async function getServerSideProps() {
  return {
    props: {
      alternateUrls: buildAlternateLanguageUrls('/search'),
    },
  };
}

import Head from 'next/head';
import { doc, getDoc } from 'firebase/firestore';
import SearchPageContent from '../../../components/search/SearchPageContent';
import { db } from '../../../lib/firebase';
import { findProfessionMetadataBySlug, getProfessionSeoData } from '../../../lib/profession-seo';
import { absoluteUrl, buildAlternateLanguageUrls, normalizeSeoLocale } from '../../../lib/seo-locale';

export default function LocalizedSearchCategoryPage({ locale, categorySlug, title, description, keywords }) {
  const path = `/search/${categorySlug}`;
  const alternateUrls = buildAlternateLanguageUrls(path);
  const canonicalUrl = absoluteUrl(locale === 'he' ? path : `/${locale}${path}`);

  return ( 
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {keywords ? <meta name="keywords" content={keywords} /> : null}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
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
      </Head>
      <SearchPageContent categorySlug={categorySlug} />
    </>
  );
}

export async function getServerSideProps({ params }) {
  const locale = normalizeSeoLocale(params?.lang);
  const categorySlug = String(params?.category || '').trim().toLowerCase();

  if (!categorySlug) {
    return { notFound: true };
  }

  if (locale === 'he') {
    return {
      redirect: {
        destination: `/search/${categorySlug}`,
        permanent: true,
      },
    };
  }

  if (locale !== params?.lang) {
    return { notFound: true };
  }

  let professionLabel = '';

  try {
    const professionsSnap = await getDoc(doc(db, 'metadata', 'professions'));
    const matchedProfession = findProfessionMetadataBySlug(professionsSnap.data()?.items, categorySlug);
    professionLabel = String(
      matchedProfession?.[locale] || matchedProfession?.he || matchedProfession?.en || ''
    ).trim();
  } catch (error) {
    professionLabel = '';
  }

  const seoData = getProfessionSeoData(categorySlug, locale, professionLabel);

  return {
    props: {
      locale,
      categorySlug,
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords?.join(', ') || '',
    },
  };
}

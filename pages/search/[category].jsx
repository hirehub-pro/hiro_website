import Head from 'next/head';
import { doc, getDoc } from 'firebase/firestore';
import SearchPageContent from '../../components/search/SearchPageContent';
import { db } from '../../lib/firebase';
import { absoluteUrl, buildAlternateLanguageUrls } from '../../lib/seo-locale';
import { getCategoryPageSeo } from '../../lib/page-seo';
import { findProfessionMetadataBySlug } from '../../lib/profession-seo';

export default function SearchCategoryPage({
  categorySlug,
  categoryTitle,
  pageDescription,
  pageKeywords,
  path,
  alternateUrls,
}) {

  return (
    <>
      <Head>
        <title>{categoryTitle}</title>
        <meta name="description" content={pageDescription} />
        {pageKeywords ? <meta name="keywords" content={pageKeywords} /> : null}
        {categorySlug ? <link rel="canonical" href={absoluteUrl(path)} /> : null}
        {alternateUrls.map((alternate) => (
          <link
            key={alternate.locale}
            rel="alternate"
            hrefLang={alternate.locale}
            href={alternate.href}
          />
        ))}
        {categorySlug ? <link rel="alternate" hrefLang="x-default" href={absoluteUrl(path)} /> : null}
      </Head>
      <SearchPageContent categorySlug={categorySlug} />
    </>
  );
}

export async function getServerSideProps({ params }) {
  const categorySlug = String(params?.category || '').trim().toLowerCase();

  if (!categorySlug) {
    return { notFound: true };
  }

  const path = `/search/${categorySlug}`;
  let professionLabel = '';

  try {
    const professionsSnap = await getDoc(doc(db, 'metadata', 'professions'));
    const matchedProfession = findProfessionMetadataBySlug(professionsSnap.data()?.items, categorySlug);
    professionLabel = String(matchedProfession?.he || matchedProfession?.en || '').trim();
  } catch (error) {
    professionLabel = '';
  }

  const categorySeo = getCategoryPageSeo(categorySlug, professionLabel);

  return {
    props: {
      categorySlug,
      categoryTitle: categorySeo.title,
      pageDescription: categorySeo.description,
      pageKeywords: categorySeo.keywords,
      path,
      alternateUrls: buildAlternateLanguageUrls(path),
    },
  };
}

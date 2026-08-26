import Head from 'next/head';
import SearchPageContent from '../../components/search/SearchPageContent';
import { getProfessions } from '../../lib/professions';
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
        <meta property="og:title" content={categoryTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={absoluteUrl(path)} />
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
    const professionItems = await getProfessions();
    const matchedProfession = findProfessionMetadataBySlug(professionItems, categorySlug);
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

import Head from 'next/head';
import { useRouter } from 'next/router';
import SearchPageContent from '../../components/search/SearchPageContent';

function formatCategoryTitle(slug) {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, function (char) { return char.toUpperCase(); })
    .trim();
}

export default function SearchCategoryPage() {
  const router = useRouter();
  const categorySlug = typeof router.query.category === 'string' ? router.query.category : '';
  const categoryTitle = formatCategoryTitle(categorySlug);

  return (
    <>
      <Head>
        <title>{categoryTitle ? `${categoryTitle} | Search | Hiro` : 'Search | Hiro'}</title>
      </Head>
      <SearchPageContent categorySlug={categorySlug} />
    </>
  );
}

import Head from 'next/head';
import { useRouter } from 'next/router';
import SearchPageContent from '../components/search/SearchPageContent';

export default function SearchPage() {
  const router = useRouter();
  const categorySlug = typeof router.query.category === 'string' ? router.query.category : '';

  return (
    <>
      <Head>
        <title>Search | Hiro</title>
      </Head>
      <SearchPageContent categorySlug={categorySlug} />
    </>
  );
}

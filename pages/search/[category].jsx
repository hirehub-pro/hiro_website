import { useRouter } from 'next/router';
import SearchPageContent from '../../components/search/SearchPageContent';

export default function SearchCategoryPage() {
  const router = useRouter();
  const categorySlug = typeof router.query.category === 'string' ? router.query.category : '';

  return <SearchPageContent categorySlug={categorySlug} />;
}

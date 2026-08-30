import { buildUrlSet, createSitemapEntries, sendXml } from '../lib/sitemap';

export function getServerSideProps({ res }) {
  const nowIso = new Date().toISOString();
  const sitemap = createSitemapEntries();

  sitemap.add('/', { lastmod: nowIso, changefreq: 'daily', priority: '1.0' });
  sitemap.add('/search', { lastmod: nowIso, changefreq: 'daily', priority: '0.9' });
  sitemap.add('/community', { lastmod: nowIso, changefreq: 'daily', priority: '0.8' });
  sitemap.add('/about', { lastmod: nowIso, changefreq: 'monthly', priority: '0.5' });
  sitemap.add('/auth/signin', { lastmod: nowIso, changefreq: 'monthly', priority: '0.5' });
  sitemap.add('/auth/signup', { lastmod: nowIso, changefreq: 'monthly', priority: '0.5' });

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function PagesSitemap() {
  return null;
}

import { SEO_LOCALES, localizePath } from '../lib/seo-locale';
import { buildUrlSet, createSitemapEntries, sendXml } from '../lib/sitemap';

export function getServerSideProps({ res }) {
  const nowIso = new Date().toISOString();
  const sitemap = createSitemapEntries();

  sitemap.add('/', { lastmod: nowIso, changefreq: 'daily', priority: '1.0' });
  sitemap.add('/search', { lastmod: nowIso, changefreq: 'daily', priority: '0.9' });

  SEO_LOCALES.filter((locale) => locale !== 'he').forEach((locale) => {
    sitemap.add(localizePath('/search', locale), {
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    });
  });

  sitemap.add('/community', { lastmod: nowIso, changefreq: 'daily', priority: '0.8' });
  sitemap.add('/contact', { lastmod: nowIso, changefreq: 'monthly', priority: '0.7' });

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function PagesSitemap() {
  return null;
}

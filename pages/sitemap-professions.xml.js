import { getProfessions } from '../lib/professions';
import { slugifyProfession } from '../lib/search-routing';
import { SEO_LOCALES, localizePath } from '../lib/seo-locale';
import { buildUrlSet, createSitemapEntries, sendXml } from '../lib/sitemap';

export async function getServerSideProps({ res }) {
  const nowIso = new Date().toISOString();
  const sitemap = createSitemapEntries();

  try {
    const professionItems = await getProfessions();

    professionItems.forEach((item) => {
      const source = item.en || item.logo || item.he || item.ar;
      const slug = slugifyProfession(source);
      if (!slug) return;

      SEO_LOCALES.forEach((locale) => {
        sitemap.add(localizePath(`/search/${slug}`, locale), {
          lastmod: nowIso,
          changefreq: 'weekly',
          priority: locale === 'he' ? '0.8' : '0.7',
        });
      });
    });
  } catch (error) {
    // Return a valid empty sitemap if professions metadata is unavailable.
  }

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function ProfessionsSitemap() {
  return null;
}

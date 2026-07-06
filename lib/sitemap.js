import { SITE_URL } from './seo-locale';

export const SITEMAP_CACHE_CONTROL =
  'public, s-maxage=3600, stale-while-revalidate=86400';

export function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function toAbsoluteUrl(path) {
  const value = String(path || '');
  return value.startsWith('http') ? value : `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

export function toLastMod(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function buildUrlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(toAbsoluteUrl(loc))}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : null,
    priority ? `    <priority>${escapeXml(priority)}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

export function buildUrlSet(entries, namespaces = []) {
  const namespaceAttrs = [
    namespaces.includes('image') ? 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '',
    namespaces.includes('video') ? 'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"' : '',
  ].filter(Boolean).join(' ');
  const urlsetTag = namespaceAttrs
    ? `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${namespaceAttrs}>`
    : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    urlsetTag,
    ...entries,
    '</urlset>',
  ].join('\n');
}

export function buildSitemapIndex(paths) {
  const entries = paths.map((path) => [
    '  <sitemap>',
    `    <loc>${escapeXml(toAbsoluteUrl(path))}</loc>`,
    '  </sitemap>',
  ].join('\n'));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
  ].join('\n');
}

export function createSitemapEntries() {
  const entries = [];
  const seen = new Set();

  return {
    add(path, options = {}) {
      const loc = toAbsoluteUrl(path);
      if (seen.has(loc)) return;

      seen.add(loc);
      entries.push(buildUrlEntry(loc, options));
    },
    getEntries() {
      return entries;
    },
  };
}

export function sendXml(res, xml) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', SITEMAP_CACHE_CONTROL);
  res.write(xml);
  res.end();
}

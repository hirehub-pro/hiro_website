import { collection, collectionGroup, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { slugifyProfession } from '../lib/search-routing';

const SITE_URL = 'https://hiro-services.com';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toLastMod(value) {
  if (!value) return new Date().toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function buildUrlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : null,
    priority ? `    <priority>${escapeXml(priority)}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

function buildSiteMap(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');
}

export async function getServerSideProps({ res }) {
  const nowIso = new Date().toISOString();
  const entries = [];
  const seen = new Set();

  function addUrl(path, options = {}) {
    const loc = path.startsWith('http') ? path : `${SITE_URL}${path}`;
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push(buildUrlEntry(loc, options));
  }

  addUrl('/', { lastmod: nowIso, changefreq: 'daily', priority: '1.0' });
  addUrl('/search', { lastmod: nowIso, changefreq: 'daily', priority: '0.9' });
  addUrl('/community', { lastmod: nowIso, changefreq: 'daily', priority: '0.8' });
  addUrl('/contact', { lastmod: nowIso, changefreq: 'monthly', priority: '0.7' });

  try {
    const professionsSnap = await getDoc(doc(db, 'metadata', 'professions'));
    const professionItems = professionsSnap.data()?.items || [];

    professionItems.forEach((item) => {
      const source = item.en || item.logo || item.he || item.ar;
      const slug = slugifyProfession(source);
      if (!slug) return;
      addUrl(`/search/${slug}`, {
        lastmod: nowIso,
        changefreq: 'weekly',
        priority: '0.8',
      });
    });
  } catch (error) {
    // Keep sitemap generation resilient if professions metadata is unavailable.
  }

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data() || {};
      const uid = userDoc.id;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);

      addUrl(`/profile/${uid}`, {
        lastmod,
        changefreq: 'weekly',
        priority: data.role === 'worker' ? '0.8' : '0.6',
      });

      if (data.role === 'worker') {
        addUrl(`/profile/${uid}/schedule`, {
          lastmod,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    });
  } catch (error) {
    // Continue with static entries if users cannot be read.
  }

  try {
    const postsSnap = await getDocs(collection(db, 'blog_posts'));
    postsSnap.docs.forEach((postDoc) => {
      const data = postDoc.data() || {};
      addUrl(`/community/${postDoc.id}`, {
        lastmod: toLastMod(data.updatedAt || data.timestamp),
        changefreq: 'weekly',
        priority: '0.7',
      });
    });
  } catch (error) {
    // Continue without community detail URLs if posts cannot be read.
  }

  try {
    const projectsSnap = await getDocs(collectionGroup(db, 'projects'));
    projectsSnap.docs.forEach((projectDoc) => {
      const data = projectDoc.data() || {};
      const pathParts = projectDoc.ref.path.split('/');
      const uid = pathParts[1];
      const projectId = pathParts[3];
      if (!uid || !projectId) return;

      addUrl(`/profile/${uid}/projects/${projectId}`, {
        lastmod: toLastMod(data.updatedAt || data.timestamp),
        changefreq: 'monthly',
        priority: '0.6',
      });
    });
  } catch (error) {
    // Continue without project URLs if project collection group cannot be read.
  }

  const sitemap = buildSiteMap(entries);

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function SiteMap() {
  return null;
}

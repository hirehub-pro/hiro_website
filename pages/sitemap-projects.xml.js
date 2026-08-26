import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildUrlSet, escapeXml, sendXml, toAbsoluteUrl, toLastMod } from '../lib/sitemap';

const DEFAULT_VIDEO_THUMBNAIL = 'https://hiro-services.com/web-app-manifest-512x512.png';

function getMediaKind(item) {
  if (!item) return 'image';

  const rawType = String(item.type || item.kind || item.contentType || '').trim().toLowerCase();
  if (rawType === 'video' || rawType.startsWith('video/')) return 'video';

  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';

  if (rawType === 'image' || rawType.startsWith('image/')) return 'image';

  return 'image';
}

function getProjectMedia(data) {
  const mediaItems = Array.isArray(data.media) ? data.media : [];
  const normalizedMedia = mediaItems
    .filter((item) => item?.url)
    .map((item) => ({
      url: item.url,
      type: getMediaKind(item),
      title: item.title || data.title || data.description || 'פרויקט בהירו',
      thumbnailUrl: item.thumbnailUrl || item.thumbnail || '',
    }));
  const fallbackImages = data.imageUrl
    ? [{ url: data.imageUrl, type: getMediaKind({ url: data.imageUrl }), title: data.title || data.description || 'פרויקט בהירו' }]
    : [];
  const allMedia = [...normalizedMedia, ...fallbackImages];
  const seenUrls = new Set();

  return allMedia.filter((item) => {
    if (!item.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });
}

function buildProjectSitemapEntry(loc, { lastmod, changefreq, priority, project, media }) {
  const title = project.title || project.description || 'פרויקט בהירו';
  const description = String(project.description || title).replace(/\s+/g, ' ').trim().slice(0, 2000);
  const images = media.filter((item) => item.type === 'image');
  const videos = media.filter((item) => item.type === 'video');
  const thumbnailUrl = images[0]?.url || DEFAULT_VIDEO_THUMBNAIL;

  return [
    '  <url>',
    `    <loc>${escapeXml(toAbsoluteUrl(loc))}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : null,
    priority ? `    <priority>${escapeXml(priority)}</priority>` : null,
    ...images.map((image) => [
      '    <image:image>',
      `      <image:loc>${escapeXml(toAbsoluteUrl(image.url))}</image:loc>`,
      `      <image:title>${escapeXml(image.title || title)}</image:title>`,
      '    </image:image>',
    ].join('\n')),
    ...videos.map((video) => [
      '    <video:video>',
      `      <video:thumbnail_loc>${escapeXml(toAbsoluteUrl(video.thumbnailUrl || thumbnailUrl))}</video:thumbnail_loc>`,
      `      <video:title>${escapeXml(video.title || title)}</video:title>`,
      `      <video:description>${escapeXml(description || title)}</video:description>`,
      `      <video:content_loc>${escapeXml(toAbsoluteUrl(video.url))}</video:content_loc>`,
      lastmod ? `      <video:publication_date>${escapeXml(lastmod)}</video:publication_date>` : null,
      '    </video:video>',
    ].filter(Boolean).join('\n')),
    '  </url>',
  ].filter(Boolean).join('\n');
}

export async function getServerSideProps({ res }) {
  const entries = [];
  const seen = new Set();

  try {
    const profilesSnap = await getDocs(query(
      collection(db, 'publicWorkerProfiles'),
      where('isSearchVisible', '==', true)
    ));
    const projectSnapshots = await Promise.all(profilesSnap.docs.map(async (profileDoc) => ({
      uid: profileDoc.id,
      snapshot: await getDocs(collection(db, 'publicWorkerProfiles', profileDoc.id, 'projects')),
    })));

    projectSnapshots.forEach(({ uid, snapshot }) => {
      snapshot.docs.forEach((projectDoc) => {
        const data = projectDoc.data() || {};
        const projectId = projectDoc.id;
        const loc = `/profile/${uid}/projects/${projectId}`;
        const absoluteLoc = toAbsoluteUrl(loc);
        if (seen.has(absoluteLoc)) return;

        seen.add(absoluteLoc);

        entries.push(buildProjectSitemapEntry(loc, {
          project: data,
          media: getProjectMedia(data),
          lastmod: toLastMod(data.updatedAt || data.timestamp),
          changefreq: 'monthly',
          priority: '0.6',
        }));
      });
    });
  } catch (error) {
    // Return a valid empty sitemap if projects are unavailable.
  }

  sendXml(res, buildUrlSet(entries, ['image', 'video']));

  return {
    props: {},
  };
}

export default function ProjectsSitemap() {
  return null;
}

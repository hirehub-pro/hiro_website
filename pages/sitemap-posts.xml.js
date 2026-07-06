import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildCommunityPostPath } from '../lib/profile-routing';
import { buildUrlSet, escapeXml, sendXml, toAbsoluteUrl, toLastMod } from '../lib/sitemap';

const DEFAULT_VIDEO_THUMBNAIL = 'https://hiro-services.com/web-app-manifest-512x512.png';

function getMediaKind(item) {
  if (!item) return 'image';
  if (item.type === 'video') return 'video';
  const rawUrl = String(item.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';
  return 'image';
}

function getPostMedia(data) {
  const mediaItems = Array.isArray(data.mediaTypes)
    ? data.mediaTypes
    : Array.isArray(data.mediaItems)
      ? data.mediaItems
      : [];
  const normalizedMedia = mediaItems
    .filter((item) => item?.url)
    .map((item) => ({
      url: item.url,
      type: getMediaKind(item),
      title: item.title || data.title || 'קהילת הירו',
      thumbnailUrl: item.thumbnailUrl || item.thumbnail || '',
    }));
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter(Boolean)
    : (data.imageUrl ? [data.imageUrl] : []);
  const fallbackImages = imageUrls.map((url) => ({
    url,
    type: 'image',
    title: data.title || 'קהילת הירו',
  }));

  const allMedia = [...normalizedMedia, ...fallbackImages];
  const seenUrls = new Set();

  return allMedia.filter((item) => {
    if (!item.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });
}

function buildPostSitemapEntry(loc, { lastmod, changefreq, priority, post, media }) {
  const title = post.title || 'פוסט בקהילת הירו';
  const description = String(post.content || post.text || title || 'פוסט בקהילת הירו').replace(/\s+/g, ' ').trim().slice(0, 2000);
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
    const postsSnap = await getDocs(collection(db, 'blog_posts'));

    postsSnap.docs.forEach((postDoc) => {
      const data = postDoc.data() || {};
      const loc = buildCommunityPostPath({
        id: postDoc.id,
        authorName: data.authorName,
      });
      const absoluteLoc = toAbsoluteUrl(loc);
      if (seen.has(absoluteLoc)) return;

      seen.add(absoluteLoc);

      entries.push(buildPostSitemapEntry(loc, {
        post: data,
        media: getPostMedia(data),
        lastmod: toLastMod(data.updatedAt || data.timestamp),
        changefreq: 'weekly',
        priority: '0.7',
      }));
    });
  } catch (error) {
    // Return a valid empty sitemap if community posts are unavailable.
  }

  sendXml(res, buildUrlSet(entries, ['image', 'video']));

  return {
    props: {},
  };
}

export default function PostsSitemap() {
  return null;
}

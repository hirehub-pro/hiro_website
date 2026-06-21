import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildCommunityPostPath } from '../lib/profile-routing';
import { buildUrlSet, createSitemapEntries, sendXml, toLastMod } from '../lib/sitemap';

export async function getServerSideProps({ res }) {
  const sitemap = createSitemapEntries();

  try {
    const postsSnap = await getDocs(collection(db, 'blog_posts'));

    postsSnap.docs.forEach((postDoc) => {
      const data = postDoc.data() || {};

      sitemap.add(buildCommunityPostPath({
        id: postDoc.id,
        authorName: data.authorName,
      }), {
        lastmod: toLastMod(data.updatedAt || data.timestamp),
        changefreq: 'weekly',
        priority: '0.7',
      });
    });
  } catch (error) {
    // Return a valid empty sitemap if community posts are unavailable.
  }

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function PostsSitemap() {
  return null;
}

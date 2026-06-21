import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildUrlSet, createSitemapEntries, sendXml, toLastMod } from '../lib/sitemap';

export async function getServerSideProps({ res }) {
  const sitemap = createSitemapEntries();

  try {
    const projectsSnap = await getDocs(collectionGroup(db, 'projects'));

    projectsSnap.docs.forEach((projectDoc) => {
      const data = projectDoc.data() || {};
      const pathParts = projectDoc.ref.path.split('/');
      const uid = pathParts[1];
      const projectId = pathParts[3];
      if (!uid || !projectId) return;

      sitemap.add(`/profile/${uid}/projects/${projectId}`, {
        lastmod: toLastMod(data.updatedAt || data.timestamp),
        changefreq: 'monthly',
        priority: '0.6',
      });
    });
  } catch (error) {
    // Return a valid empty sitemap if projects are unavailable.
  }

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function ProjectsSitemap() {
  return null;
}

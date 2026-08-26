import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildProfilePath } from '../lib/profile-routing';
import { buildUrlSet, createSitemapEntries, sendXml, toLastMod } from '../lib/sitemap';

export async function getServerSideProps({ res }) {
  const sitemap = createSitemapEntries();

  try {
    const usersSnap = await getDocs(query(
      collection(db, 'publicWorkerProfiles'),
      where('isSearchVisible', '==', true)
    ));

    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data() || {};
      const uid = userDoc.id;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);

      sitemap.add(buildProfilePath({ uid, name: data.name }), {
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      });

    });
  } catch (error) {
    // Return a valid empty sitemap if profiles are unavailable.
  }

  sendXml(res, buildUrlSet(sitemap.getEntries()));

  return {
    props: {},
  };
}

export default function ProfilesSitemap() {
  return null;
}

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildProfilePath } from '../lib/profile-routing';
import { buildUrlSet, createSitemapEntries, sendXml, toLastMod } from '../lib/sitemap';

export async function getServerSideProps({ res }) {
  const sitemap = createSitemapEntries();

  try {
    const usersSnap = await getDocs(collection(db, 'users'));

    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data() || {};
      const uid = userDoc.id;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);

      sitemap.add(buildProfilePath({ uid, name: data.name }), {
        lastmod,
        changefreq: 'weekly',
        priority: data.role === 'worker' ? '0.8' : '0.6',
      });

      if (data.role === 'worker') {
        sitemap.add(`/profile/${uid}/schedule`, {
          lastmod,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
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

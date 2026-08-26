import { buildSitemapIndex, sendXml } from '../lib/sitemap';
     
const SITEMAPS = [             
  '/sitemap-pages.xml',
  '/sitemap-professions.xml',
  '/sitemap-profiles.xml',
  '/sitemap-posts.xml',
  '/sitemap-projects.xml',
];

export function getServerSideProps({ res }) {
  sendXml(res, buildSitemapIndex(SITEMAPS));

  return {
    props: {},
  };
}

export default function SitemapIndex() {
  return null;
}

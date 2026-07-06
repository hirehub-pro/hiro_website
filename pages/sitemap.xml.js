import { buildSitemapIndex, sendXml } from '../lib/sitemap';
     
const SITEMAPS = [             
  '/sitemap-pages.xml',
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

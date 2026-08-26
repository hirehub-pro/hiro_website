/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/he/search',
        destination: '/search',
        permanent: true,
      },
      {
        source: '/he/search/:category',
        destination: '/search/:category',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/privacy-policy',
        destination: '/privacy-policy.html',
      },
      {
        source: '/terms-of-service',
        destination: '/terms-of-service.html',
      },
      {
        source: '/sign/:path*',
        destination:
          'https://us-central1-hire-hub-fe6c4.cloudfunctions.net/publicDocumentSigning/sign/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:file(favicon.ico|favicon.svg|favicon-96x96.png|apple-touch-icon.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png|site.webmanifest)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleapis.com',
      'loremflickr.com',
      'ui-avatars.com',
    ],
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleapis.com',
      'loremflickr.com',
      'ui-avatars.com',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/search/:category',
        destination: '/search?category=:category',
      },
    ];
  },
};

module.exports = nextConfig;

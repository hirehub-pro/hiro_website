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
};

module.exports = nextConfig;

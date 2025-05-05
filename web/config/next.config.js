/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "export", // Disable SSR for all pages
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

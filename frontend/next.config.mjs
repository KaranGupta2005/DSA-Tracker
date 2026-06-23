/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'userpic.codeforces.org',
      },
    ],
  },
};

export default nextConfig;

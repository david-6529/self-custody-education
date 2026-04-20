/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.seadn.io",
      },
    ],
  },
  // /prompt-machine lives as a nested route in this same Next.js app now, so
  // no cross-project redirect is needed.
};

export default nextConfig;

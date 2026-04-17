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
  async rewrites() {
    return [
      {
        source: "/prompt-machine",
        destination: "https://prompt-gallery-theta.vercel.app?_via=gvc",
      },
      {
        source: "/prompt-machine/:path*",
        destination: "https://prompt-gallery-theta.vercel.app/:path*?_via=gvc",
      },
    ];
  },
};

export default nextConfig;

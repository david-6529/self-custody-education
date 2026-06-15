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
      // The Framery — proxied from a separate Vercel project.
      {
        source: "/framery",
        destination: "https://screenshot-background-phi.vercel.app/framery",
      },
      {
        source: "/framery/:path*",
        destination: "https://screenshot-background-phi.vercel.app/framery/:path*",
      },
      // Vibeathon Community Builds — proxied from the showcase Vercel project.
      // Destination keeps the /builds prefix because the showcase ships with
      // basePath: '/builds' on its side; its assets emit /builds/_next/...
      // paths that need to land at that same prefix on the proxy target.
      {
        source: "/builds",
        destination: "https://gvc-vibeathon-showcase.vercel.app/builds",
      },
      {
        source: "/builds/:path*",
        destination: "https://gvc-vibeathon-showcase.vercel.app/builds/:path*",
      },
    ];
  },
  // /prompt-machine lives as a nested route in this same Next.js app now, so
  // no cross-project redirect is needed.
};

export default nextConfig;

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
    ];
  },
  async redirects() {
    return [
      // Vibeathon Community Builds — temporary 302 to the showcase's standalone
      // URL until the owner ships basePath: '/builds'. Once that's live, swap
      // this redirect back to the rewrite block above so /builds proxies in
      // place under goodvibesclub.ai.
      {
        source: "/builds",
        destination: "https://gvc-vibeathon-showcase.vercel.app/",
        permanent: false,
      },
      {
        source: "/builds/:path*",
        destination: "https://gvc-vibeathon-showcase.vercel.app/:path*",
        permanent: false,
      },
    ];
  },
  // /prompt-machine lives as a nested route in this same Next.js app now, so
  // no cross-project redirect is needed.
};

export default nextConfig;

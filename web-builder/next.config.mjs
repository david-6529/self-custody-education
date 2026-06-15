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
      {
        source: "/builds",
        destination: "https://gvc-vibeathon-showcase.vercel.app/",
      },
      {
        source: "/builds/:path*",
        destination: "https://gvc-vibeathon-showcase.vercel.app/:path*",
      },
    ];
  },
  // /prompt-machine lives as a nested route in this same Next.js app now, so
  // no cross-project redirect is needed.
};

export default nextConfig;

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
  async redirects() {
    // Reverse-proxy rewrites to an external Next.js app break static asset
    // paths (_next/* resolves against the proxy host, not the origin), so we
    // redirect instead. Users bounce to prompt-gallery-theta.vercel.app
    // directly. Swap to a subdomain (prompt-machine.goodvibesclub.ai) later
    // once we want the URL to stay on the canonical domain.
    // The ?_via=gvc marker tells the prompt-gallery project to NOT bounce
    // users back to goodvibesclub.ai/prompt-machine (which would loop).
    return [
      {
        source: "/prompt-machine",
        destination: "https://prompt-gallery-theta.vercel.app?_via=gvc",
        permanent: false,
      },
      {
        source: "/prompt-machine/:path*",
        destination: "https://prompt-gallery-theta.vercel.app/:path*?_via=gvc",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

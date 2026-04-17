/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    // Only redirect the root-path homepage to the new canonical URL.
    // Keep /admin, /api/*, and /_next/* reachable at the old domain so admin tooling
    // and direct API consumers keep working.
    return [
      {
        source: "/",
        missing: [{ type: "query", key: "_via" }],
        has: [{ type: "host", value: "prompt-gallery-theta.vercel.app" }],
        destination: "https://goodvibesclub.ai/prompt-machine",
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;

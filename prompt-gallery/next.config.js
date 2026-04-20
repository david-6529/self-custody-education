/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    // Direct visits to prompt-gallery-theta.vercel.app bounce to the canonical
    // goodvibesclub.ai/prompt-machine URL. The `_via=gvc` marker (set by the
    // web project when it forwards here) short-circuits this redirect so the
    // two projects don't ping-pong.
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

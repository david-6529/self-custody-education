/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    // Prompt Machine has moved into web-builder and now lives at
    // goodvibesclub.ai/prompt-machine. Everything (pages + API) redirects
    // there. Keep this project deployed just long enough for any cached
    // bookmarks/webhooks to redirect cleanly, then decommission.
    return [
      {
        source: "/",
        destination: "https://goodvibesclub.ai/prompt-machine",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "https://goodvibesclub.ai/prompt-machine/admin",
        permanent: true,
      },
      {
        source: "/api/admin",
        destination: "https://goodvibesclub.ai/api/prompt-machine/admin",
        permanent: true,
      },
      {
        source: "/api/admin/:path*",
        destination: "https://goodvibesclub.ai/api/prompt-machine/admin/:path*",
        permanent: true,
      },
      {
        source: "/api/submissions",
        destination: "https://goodvibesclub.ai/api/prompt-machine/submissions",
        permanent: true,
      },
      {
        source: "/api/submissions/:path*",
        destination: "https://goodvibesclub.ai/api/prompt-machine/submissions/:path*",
        permanent: true,
      },
      {
        source: "/api/categories",
        destination: "https://goodvibesclub.ai/api/prompt-machine/categories",
        permanent: true,
      },
      {
        source: "/api/generate",
        destination: "https://goodvibesclub.ai/api/prompt-machine/generate",
        permanent: true,
      },
      {
        source: "/api/overrides",
        destination: "https://goodvibesclub.ai/api/prompt-machine/overrides",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;

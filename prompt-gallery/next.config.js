/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Redirect to goodvibesclub.ai/prompt-machine is temporarily disabled while
  // the DNS for goodvibesclub.ai is being hooked up. Re-enable once the domain
  // resolves so direct visits to prompt-gallery-theta.vercel.app land on the
  // canonical URL.
  // async redirects() {
  //   return [
  //     {
  //       source: "/",
  //       missing: [{ type: "query", key: "_via" }],
  //       has: [{ type: "host", value: "prompt-gallery-theta.vercel.app" }],
  //       destination: "https://goodvibesclub.ai/prompt-machine",
  //       permanent: false,
  //     },
  //   ];
  // },
};
module.exports = nextConfig;

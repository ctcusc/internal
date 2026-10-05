import "./src/env.js";

const isPreviewBuild = process.env.PREVIEW_BUILD === "true";

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: isPreviewBuild },
  typescript: { ignoreBuildErrors: isPreviewBuild },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;

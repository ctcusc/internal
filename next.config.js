import "./src/env.js";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const isPreviewBuild = process.env.PREVIEW_BUILD === "true";

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
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

import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slim runtime image: emits .next/standalone with a self-contained server.js.
  output: "standalone",
  // Next's gzip stays on (the default): cloudflared doesn't compress, so this
  // is what keeps the tunnel hop to Cloudflare's edge small. The edge only
  // re-encodes for the browser — it can't shrink what we send it.
  // better-sqlite3 ships a native .node binding that must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
  // A stray lockfile in $HOME makes Next infer the workspace root as ~, which
  // traces the wrong files into the standalone build. Pin it to this project.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  // Nothing in front of the app sets these: cloudflared forwards response
  // headers through unchanged and the edge adds none of them. Setting them
  // here keeps them in the repo rather than in a dashboard rule nobody
  // remembers exists.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Keep the hostname a subdomain: on an apex, includeSubDomains
            // would force every sibling subdomain to HTTPS for a year in any
            // browser that had seen this header.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

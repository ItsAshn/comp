import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slim runtime image: emits .next/standalone with a self-contained server.js.
  output: "standalone",
  // better-sqlite3 ships a native .node binding that must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
  // A stray lockfile in $HOME makes Next infer the workspace root as ~, which
  // traces the wrong files into the standalone build. Pin it to this project.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
